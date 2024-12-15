package edu.cmu.cs.sasylf.ast;

import static edu.cmu.cs.sasylf.util.Util.debug;

import java.io.InputStream;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.reduction.InductionSchema;
import edu.cmu.cs.sasylf.term.FreeVar;
import edu.cmu.cs.sasylf.term.Substitution;
import edu.cmu.cs.sasylf.term.Term;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Errors;
import edu.cmu.cs.sasylf.util.Location;
import edu.cmu.cs.sasylf.util.Pair;
import edu.cmu.cs.sasylf.util.SASyLFError;
import edu.cmu.cs.sasylf.interactive.InteractiveProof;
import edu.cmu.cs.sasylf.interactive.QuitException;

public class Theorem extends RuleLike {
	public Theorem(String n, Location l) {
		this(n, l, false);
	}

	public Theorem(String n, Location l, boolean abs) {
		super(n, l);
		isAbstract = abs;
		derivations = new ArrayList<Derivation>();
	}

	public List<Fact> getForalls() {
		return foralls;
	}

	@Override
	public List<Element> getPremises() {
		List<Element> l = new ArrayList<Element>();
		for (Fact f : foralls) {
			l.add(f.getElement());
		}
		return l;
	}

	@Override
	public Clause getConclusion() {
		return exists;
	}

	public Clause getExists() {
		return exists;
	}

	public List<Derivation> getDerivations() {
		return derivations;
	}

	public void setAnd(Theorem next) {
		debug("setting and of ", this.getName(), " to ", next.getName());
		andTheorem = next;
		andTheorem.firstInGroup = firstInGroup;
		andTheorem.indexInGroup = indexInGroup + 1;
	}

	public Theorem getGroupLeader() {
		return firstInGroup;
	}

	public int getGroupIndex() {
		return indexInGroup;
	}

	public InductionSchema getInductionSchema() {
		return inductionScheme;
	}

	/**
	 * A theorem's existential variables are those that appear in its conclusion
	 * but not in its premises.
	 */
	@Override
	public Set<FreeVar> getExistentialVars() {
		Set<FreeVar> vars = exists.asTerm().getFreeVariables();
		for (Element e : getPremises()) {
			vars.removeAll(e.asTerm().getFreeVariables());
		}
		return vars;
	}

	@Override
	public void prettyPrint(PrintWriter out) {
		out.print(getKind());
		out.print(' ');
		out.print(getName());
		out.println(':');
		for (Fact forall : getForalls()) {
			out.print("  forall ");
			forall.prettyPrint(out);
			out.println();
		}
		out.print("  exists ");
		getExists().prettyPrint(out);
		out.println(".");
		/*
		 * for (Derivation d : derivations) { d.prettyPrint(out); }
		 */
		out.print("end ");
		out.print(getKind());
		out.println();
	}

	public void checkInterface(Context ctx) {
		if (!interfaceChecked) {
			ctx.bindingTypes = new HashMap<String, List<ElemType>>();
			int oldErrors = ErrorHandler.getErrorCount();
			interfaceChecked = true;
			if (assumes != null) {
				assumes.typecheck(ctx);
				SyntaxDeclaration syntax = assumes.getType();
				if (syntax == null || !syntax.isInContextForm()) {
					ErrorHandler.recoverableError(Errors.ILLEGAL_ASSUMES, assumes);
				}
			}
			List<String> inputNames = new ArrayList<String>();
			for (Fact f : foralls) {
				f.typecheck(ctx);
				inputNames.add(f.getName());
				if (f instanceof NonTerminalAssumption) {
					NonTerminalAssumption sa = (NonTerminalAssumption) f;
					NonTerminal root = sa.getRoot();
					if (root != null) {
						if (!root.getType().canAppearIn(sa.getSyntax().typeTerm())) {
							ErrorHandler.error(Errors.EXTRANEOUS_ASSUMES, f,
									"assumes " + root.toString());
						}
					}
				}
			}

			exists = exists.typecheck(ctx);
			Element computed = exists.computeClause(ctx, false);
			if (computed instanceof ClauseUse
					&& computed.getType() instanceof Judgment) {
				exists = (Clause) computed;
			} else {
				ErrorHandler.recoverableError(Errors.EXISTS_SYNTAX, computed);
			}

			inductionScheme = null;
			for (Derivation d : derivations) {
				if (d instanceof DerivationByInduction) {
					DerivationByInduction dbi = (DerivationByInduction) d;
					InductionSchema is = InductionSchema.create(this, dbi.getArgStrings(),
							true);
					if (is != null) {
						inductionScheme = is;
						// Inconsistency found later
						break;
					} else if (inductionScheme == null) {
						inductionScheme = InductionSchema.nullInduction; // prevent cascade
																															// error
					}
				}
			}
			if (inductionScheme == null) {
				if (this != firstInGroup || this.andTheorem != null) {
					ErrorHandler.warning(Errors.INDUCTION_MUTUAL_MISSING, this);
					inductionScheme = InductionSchema.create(this,
							foralls.get(0).getElement(), true);
				} else {
					inductionScheme = InductionSchema.nullInduction;
				}
			}
			if (this != firstInGroup) {
				// for side-effect:
				inductionScheme.matches(firstInGroup.getInductionSchema(), this, false);
			}

			if (oldErrors == ErrorHandler.getErrorCount())
				interfaceOK = true;
		}
	}

	public Context run(InteractiveProof prf, Context ctx) throws QuitException {
		// TODO: do the rest of interactive type check here too

		Context newCtx = this.interactiveTypeCheckSetup(prf, ctx);

		boolean isTheoremFinished = false;

		while (!isTheoremFinished) {

			System.out.println("Theorem Term: " + this.exists.asTerm().toString());
			System.out.println("Current goal: " + newCtx.currentGoal.toString());

			InputStream inputCommand = prf.getNextCommand();

			DSLToolkitParser parser = new DSLToolkitParser(inputCommand, "UTF-8");

			try {
				Derivation derivation = parser.DerivationHeader();

				// TODO: Should update context with new goal
				isTheoremFinished = this.addAndTypeCheckDerivation(newCtx, derivation);

				// if it type checks add the derivation to the theorem
				this.getDerivations().add(derivation);
			} catch (ParseException e) {
				System.out.println(e.getMessage());
			}
		}

		// TODO: update the current context to include the new derivation
		// TODO: Allow <END> ( <THEOREM> | <LEMMA> ) after all stuff
		return newCtx;
	}

	private Context setupTypeChecking(Context ctx, int oldErrorCount) {
		debug("checking ", kind, " ", this.getName());

		Context newCtx = ctx.clone();

		newCtx.derivationMap = new HashMap<String, Fact>();
		newCtx.inputVars = new HashSet<FreeVar>();
		newCtx.outputVars = new HashSet<FreeVar>();
		newCtx.currentSub = new Substitution();
		newCtx.currentTheorem = this;
		newCtx.assumedContext = null;

		checkInterface(newCtx);

		if (isAbstract) {
			if (!derivations.isEmpty()) {
				ErrorHandler.recoverableError(Errors.THEOREM_ABSTRACT, this);
			}
			return newCtx;
		}

		if (!interfaceOK || ErrorHandler.getErrorCount() > oldErrorCount) {
			return newCtx;
		}

		/*
		 * if (andTheorem != null) { andTheorem.addToMap(newCtx); }
		 */
		newCtx.recursiveTheorems = new HashMap<String, Theorem>();
		firstInGroup.addToMap(newCtx);

		newCtx.bindingTypes = new HashMap<String, List<ElemType>>();

		if (assumes != null) {
			newCtx.assumedContext = assumes;
		}
		newCtx.varFreeNTmap.clear();

		for (Fact f : foralls) {
			f.typecheck(newCtx);
			f.addToDerivationMap(newCtx);
			newCtx.subderivations.put(f, new Pair<Fact, Integer>(f, 0));
			Set<FreeVar> freeVariables = f.getElement().asTerm().getFreeVariables();
			newCtx.inputVars.addAll(freeVariables);
		}

		Term theoremTerm = exists.asTerm();
		newCtx.currentGoal = theoremTerm;

		newCtx.currentGoalClause = exists;
		newCtx.outputVars.addAll(theoremTerm.getFreeVariables());
		newCtx.outputVars.removeAll(newCtx.inputVars);

		for (Fact f : foralls) {
			NonTerminal root = f.getElement().getRoot();
			newCtx.addKnownContext(root);
		}
		if (assumes != null) {
			boolean foundAssumption = false;
			for (Fact f : foralls) {
				NonTerminal root = f.getElement().getRoot();
				if (assumes.equals(root))
					foundAssumption = true;
			}
			if (assumes.equals(exists.getRoot()))
				foundAssumption = true;
			if (!foundAssumption) {
				ErrorHandler.warning(Errors.EXTRANEOUS_ASSUMES, assumes);
			}
		}
		if (newCtx.knownContexts != null && !newCtx.knownContexts.isEmpty()) {
			if (newCtx.knownContexts.size() > 1 || newCtx.assumedContext != null) {
				ErrorHandler.recoverableError(Errors.THEOREM_MULTIPLE_CONTEXT, this);
			} else {
				NonTerminal root = newCtx.knownContexts.iterator().next();
				if (assumes == null) {
					ErrorHandler.warning(Errors.ASSUMED_ASSUMES, this, "assumes " + root);
				}
			}
			if (assumes == null) { // Avoid further errors XXX: EXTENSION POINT
				assumes = newCtx.knownContexts.iterator().next();
				newCtx.assumedContext = assumes;
			}
		}

		return newCtx;
	}

	private Context interactiveTypeCheckSetup(InteractiveProof prf, Context ctx) {
		if (edu.cmu.cs.sasylf.util.Util.VERBOSE) {
			System.out.println(getKindTitle() + " " + getName());
		}
		
		if (!ctx.ruleMap.containsKey(getName())) {
			ctx.ruleMap.put(getName(), this);
		} else if (ctx.ruleMap.get(getName()) != this) {
			ErrorHandler.recoverableError(Errors.RULE_LIKE_REDECLARED, this);
		}

		int oldErrorCount = ErrorHandler.getErrorCount();
		Context newCtx = ctx.clone();
		try {
			newCtx = this.setupTypeChecking(newCtx, oldErrorCount);
		} catch (SASyLFError e) {
			System.out.println(e.getMessage());
		} finally {
			int newErrorCount = ErrorHandler.getErrorCount() - oldErrorCount;
			if (edu.cmu.cs.sasylf.util.Util.VERBOSE) {
				if (newErrorCount > 0) {
					System.out.println("Error(s) in " + getKind() + " " + getName());
				}
			}
		}

		return newCtx;
	}

	public boolean addAndTypeCheckDerivation(Context ctx, Derivation derivation) {
		List<Derivation> derivations = new ArrayList<Derivation>();
		derivations.add(derivation);
		return Derivation.typecheck(this, ctx, derivations, false);
	}

	public void typecheck(Context oldCtx) {
		if (edu.cmu.cs.sasylf.util.Util.VERBOSE) {
			System.out.println(getKindTitle() + " " + getName());
		}
		
		if (!oldCtx.ruleMap.containsKey(getName())) {
			oldCtx.ruleMap.put(getName(), this);
		} else if (oldCtx.ruleMap.get(getName()) != this) {
			ErrorHandler.recoverableError(Errors.RULE_LIKE_REDECLARED, this);
		}

		int oldErrorCount = ErrorHandler.getErrorCount();
		Context ctx = oldCtx.clone();
		try {
			ctx = this.setupTypeChecking(ctx, oldErrorCount);
			Derivation.typecheck(this, ctx, derivations);
		} catch (SASyLFError e) {
			// ignore the error; it has already been reported
			// e.printStackTrace();
		} finally {
			int newErrorCount = ErrorHandler.getErrorCount() - oldErrorCount;
			if (edu.cmu.cs.sasylf.util.Util.VERBOSE) {
				if (newErrorCount > 0) {
					System.out.println("Error(s) in " + getKind() + " " + getName());
				}
			}
		}
	}

	private void addToMap(Context ctx) {
		checkInterface(ctx);
		ctx.recursiveTheorems.put(getName(), this);

		if (andTheorem != null) {
			andTheorem.addToMap(ctx);
		}
	}

	public void setKind(String k) {
		if (kind != null && kind.equals(k))
			return;
		if (k == null)
			k = "theorem";
		if (k.length() == 0)
			k = "theorem";
		kind = k;
		kindTitle = Character.toTitleCase(k.charAt(0)) + kind.substring(1);
	}

	@Override
	public String getKind() {
		return kind;
	}

	public String getKindTitle() {
		return kindTitle;
	}

	/**
	 * Return true if this theorem has a well-defined interface, even if it wasn't
	 * successfully proved. Theorems without OK interfaces should not be used.
	 * 
	 * @return whether this theorem has a sensible interface
	 */
	@Override
	public boolean isInterfaceOK() {
		return interfaceOK;
	}

	/**
	 * Set the assumption (context) for a theorem. An internal error is thrown if
	 * this method is called twice with different values.
	 * 
	 * @param c
	 *            context to use
	 */
	public void setAssumes(NonTerminal c) {
		if (assumes != null && !assumes.equals(c))
			ErrorHandler.error(Errors.INTERNAL_ERROR,
					"setAssumes: " + assumes + " != " + c, this);
		assumes = c;
	}

	@Override
	public NonTerminal getAssumes() {
		return assumes;
	}

	public void setExists(Clause c) {
		List<Element> elems = c.getElements();
		int n = elems.size();
		// We remove the "dot" at the end, if it is there (old style)
		if (n >= 1) {
			Element last = elems.get(n - 1);
			if (last instanceof Terminal && ((Terminal) last).getName().equals(".")) {
				elems.remove(n - 1);
				--n;
				if (n > 0) {
					c.setEndLocation((elems.get(n - 1).getEndLocation()));
				}
			}
		}
		while (n == 1 && elems.get(0) instanceof Clause) {
			c = (Clause) elems.get(0);
			elems = c.getElements();
			n = elems.size();
		}
		exists = c;
	}

	private String kind = "theorem";
	private String kindTitle = "Theorem";
	private NonTerminal assumes = null;
	private List<Fact> foralls = new ArrayList<Fact>();
	private Clause exists;
	private final List<Derivation> derivations;
	private Theorem andTheorem;
	private Theorem firstInGroup = this;
	private int indexInGroup = 0;
	private InductionSchema inductionScheme = InductionSchema.nullInduction;
	private boolean interfaceChecked = false;
	private boolean interfaceOK = false;
	private final boolean isAbstract;

	@Override
	public void collectQualNames(Consumer<QualName> consumer) {
		for (Derivation derivation : derivations) {
			derivation.collectQualNames(consumer);
		}
	}

}
