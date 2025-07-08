package edu.cmu.cs.sasylf.ast;

import static edu.cmu.cs.sasylf.util.Util.debug;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.cmu.cs.sasylf.interactive.Orchestrator;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.parser.Token;
import edu.cmu.cs.sasylf.reduction.InductionSchema;
import edu.cmu.cs.sasylf.term.FreeVar;
import edu.cmu.cs.sasylf.term.Substitution;
import edu.cmu.cs.sasylf.term.Term;
import edu.cmu.cs.sasylf.util.*;

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
			for (Fact f : foralls) {
				f.typecheck(ctx);
				if (f instanceof NonTerminalAssumption sa) {
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
				if (d instanceof DerivationByInduction dbi) {
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
							foralls.getFirst().getElement(), true);
				} else {
					inductionScheme = InductionSchema.nullInduction;
				}
			}
			if (this != firstInGroup) {
				// for side-effect:
                assert inductionScheme != null;
                inductionScheme.matches(firstInGroup.getInductionSchema(), this, false);
			}

			if (oldErrors == ErrorHandler.getErrorCount())
				interfaceOK = true;
		}
	}

	/// Runs the interactive mode for [Theorem]
	///
	/// @param orch
	/// @param ctx  [Context] to use. Does not have to be cloned by the caller
	/// @return a new updated copy of [ctx]
	public Context run(Orchestrator orch, Context ctx, Token t0) {
		final Context[] finalCtx = {this.interactiveTypeCheckSetup(ctx.clone())};

		final boolean[] done = {false};
		while (!done[0]) {
			var newCtx = finalCtx[0].clone();

			orch.runNextNode(newCtx, new Orchestrator.Delegate<>(DSLToolkitParser::DerivationPrologue) {
				@Override
				public void run(Context ctx, Derivation d) {
					if (d instanceof DerivationByInduction di) {
						InductionSchema is = InductionSchema.create(Theorem.this, di.getArgStrings(),
								true);
						if (is != null) {
							inductionScheme = is;
						} else if (inductionScheme == null) {
							inductionScheme = InductionSchema.nullInduction; // prevent cascade
						}
					}

					var oldErrorCount = ErrorHandler.getErrorCount();
					Theorem.this.getDerivations().add(d);
					d.run(orch, ctx);
					d.addToDerivationMap(ctx);
					var newErrorCount = ErrorHandler.getErrorCount();
					if (newErrorCount > oldErrorCount) {
						getDerivations().remove(d);
						inductionScheme = InductionSchema.nullInduction;
					} else {
						finalCtx[0] = ctx;
					}
				}
			}, new Orchestrator.Delegate<>(parser -> parser.TheoremEpilogue(this, t0, false)) {
				@Override
				public void run(Context ctx, Theorem thm) {
					done[0] = true;
				}
			});
		}

		return finalCtx[0];
	}

	private Context setupTypeChecking(Context ctx, int oldErrorCount) {
		debug("checking ", kind, " ", this.getName());

		Context newCtx = ctx.clone();

		newCtx.derivationMap = new HashMap<>();
		newCtx.inputVars = new HashSet<>();
		newCtx.outputVars = new HashSet<>();
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

	/// Sets up the object for the [run] function same as the [typecheck] function does around the derivation's [typecheck] call
	/// @param ctx [Context] to use. Should be cloned by caller, is altered directly.
	private Context interactiveTypeCheckSetup(Context ctx) {
		debug(getKindTitle() + " " + getName());

		if (!ctx.ruleMap.containsKey(getName())) {
			ctx.ruleMap.put(getName(), this);
		} else if (ctx.ruleMap.get(getName()) != this) {
			ErrorHandler.recoverableError(Errors.RULE_LIKE_REDECLARED, this);
		}

		int oldErrorCount = ErrorHandler.getErrorCount();
		try {
			ctx = this.setupTypeChecking(ctx, oldErrorCount);
		} catch (SASyLFError e) {
			System.out.println(e.getMessage());
		} finally {
			int newErrorCount = ErrorHandler.getErrorCount() - oldErrorCount;
			if (Util.VERBOSE) {
				if (newErrorCount > 0) {
					System.out.println("Error(s) in " + getKind() + " " + getName());
				}
			}
		}

		return ctx;
	}

	public void typecheck(Context oldCtx) {
		if (Util.VERBOSE) {
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
			if (Util.VERBOSE) {
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
		if (k.isEmpty())
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
		while (n == 1 && elems.getFirst() instanceof Clause) {
			c = (Clause) elems.getFirst();
			elems = c.getElements();
			n = elems.size();
		}
		exists = c;
	}

	private String kind = "theorem";
	private String kindTitle = "Theorem";
	private NonTerminal assumes = null;
	private final List<Fact> foralls = new ArrayList<Fact>();
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

	public ObjectNode getInteractiveInfo() {
		var mapper = new ObjectMapper();
		var rootNode = mapper.createObjectNode();

		var forallsNode = mapper.createArrayNode();
		for (Fact forall : this.getForalls()) {
			var forallNode = mapper.createObjectNode();
			forallNode.put("name", forall.getName());
			forallNode.set("element", forall.getElement().getInteractiveInfo());
			forallsNode.add(forallNode);
		}
		rootNode.set("foralls", forallsNode);
		rootNode.set("exists", this.getExists().asTerm().getInteractiveInfo());

		return rootNode;
	}

}
