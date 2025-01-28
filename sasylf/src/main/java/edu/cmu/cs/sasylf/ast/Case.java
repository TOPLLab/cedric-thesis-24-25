package edu.cmu.cs.sasylf.ast;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import edu.cmu.cs.sasylf.interactive.Orchestrator;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.util.DefaultSpan;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Location;
import edu.cmu.cs.sasylf.util.Pair;
import edu.cmu.cs.sasylf.util.Span;


public class Case extends Node {
	public Case(Location l, Location l1, Location l2) { 
		super(l); 
		span = new DefaultSpan(l1,l2);
	}

	public List<Derivation> getDerivations() { return derivations; }

	public Span getSpan() {
		return span;
	}

	@Override
	public void prettyPrint(PrintWriter out) {
		for (Derivation d : derivations) {
			d.prettyPrint(out);
		}
		out.println("end case\n");
	}

	public void typecheck(Context ctx, Pair<Fact,Integer> isSubderivation) {
		ErrorHandler.recordLastSpan(this);
		Map<String, Fact> oldMap = ctx.derivationMap;
		ctx.derivationMap = new HashMap<>(oldMap);

		Derivation.typecheck(this, ctx, derivations);

		ctx.derivationMap = oldMap;
	}

	/// Runs the type checking for interactive mode for [Case]
	/// @param ctx Context to use. Should be cloned by the caller
	public void run(Orchestrator orch, Context ctx, Pair<Fact,Integer> isSubderivation) throws ParseException {
		final Context[] finalCtx = {ctx.clone()};
		ErrorHandler.recordLastSpan(this);
		Map<String, Fact> oldMap = finalCtx[0].derivationMap;
		finalCtx[0].derivationMap = new HashMap<>(oldMap);

		final var derivationPrologue = new Orchestrator.Delegate<>(DSLToolkitParser::DerivationPrologue) {
			@Override
			public void run(Context ctx, Derivation d) throws ParseException {
				var oldErrorCount = ErrorHandler.getErrorCount();
				derivations.add(d);
				d.run(orch, ctx);
				d.addToDerivationMap(ctx);
				var newErrorCount = ErrorHandler.getErrorCount();
				if (newErrorCount > oldErrorCount) {
					derivations.remove(d);
				} else {
					finalCtx[0] = ctx;
				}
			}
		};

		// Parse at least one derivation
		orch.runNextNode(finalCtx[0], derivationPrologue);

		final boolean[] done = {false};
		while (!done[0]) {
			orch.runNextNode(finalCtx[0], derivationPrologue, new Orchestrator.Delegate<>(parser -> parser.CaseEpilogue(this)) {
				@Override
				public void run(Context ctx, Case value) {
					done[0] = true;
				}
			});
		}

		ctx.derivationMap = oldMap;
	}

	// verify: that last derivation is what i.h. requires

	private final List<Derivation> derivations = new ArrayList<>();
	private final Span span;
	
	@Override
	public void collectQualNames(Consumer<QualName> consumer) {
		for (Derivation derivation : derivations) {
			derivation.collectQualNames(consumer);
		}
	}
}

