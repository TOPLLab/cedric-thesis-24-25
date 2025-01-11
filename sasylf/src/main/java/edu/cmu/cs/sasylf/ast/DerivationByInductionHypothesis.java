package edu.cmu.cs.sasylf.ast;

import edu.cmu.cs.sasylf.interactive.InteractiveProof;
import edu.cmu.cs.sasylf.interactive.QuitException;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.util.Location;



public class DerivationByInductionHypothesis extends DerivationByIHRule {
	public DerivationByInductionHypothesis(String n, Location l, Clause c) {
		super(n,l,c);
	}
	@Override
	public String prettyPrintByClause() {
		return " by induction hypothesis";
	}
	@Override
	public RuleLike getRule(Context ctx) {
		return ctx.currentTheorem;
	}
	@Override
	public String getRuleName() { return "induction hypothesis"; }

	@Override
	public void typecheck(Context ctx) {
		super.typecheck(ctx);

		this.checkInduction(ctx, ctx.currentTheorem, ctx.currentTheorem);
	}

	@Override
	public void run(InteractiveProof prf, Context ctx) throws ParseException, QuitException {
		super.run(prf, ctx);

		this.checkInduction(ctx, ctx.currentTheorem, ctx.currentTheorem);
	}


}
