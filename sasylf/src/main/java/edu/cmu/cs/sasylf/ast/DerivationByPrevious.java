package edu.cmu.cs.sasylf.ast;

import edu.cmu.cs.sasylf.interactive.Orchestrator;
import edu.cmu.cs.sasylf.util.*;

import java.util.ArrayList;
import java.util.List;


public class DerivationByPrevious extends DerivationWithArgs {
    public DerivationByPrevious(String n, Location l, Clause c) {
        super(n, l, c);
    }

    @Override
    public String prettyPrintByClause() {
        return " by ";
    }


    // verify: that this is the same as the previous one, except with any new subs
    @Override
    public void typecheck(Context ctx) {
        super.typecheck(ctx);

        Clause cl = this.getClause();

        List<ClauseUse> sourceClauses = new ArrayList<>();
        for (Fact f : this.getArgs()) {
            if (f instanceof Derivation) {
                sourceClauses.add((ClauseUse) f.getElement());
                continue;
            }
            ErrorHandler.error(Errors.ANDOR_NOSYNTAX, f.getName(), this);
        }
        Util.verify(!sourceClauses.isEmpty(), "should have at least one");
        ClauseUse source = sourceClauses.getFirst();
        if (sourceClauses.size() > 1) {
            Util.debug("Making and clause for " + sourceClauses);
            source = AndClauseUse.makeAndClause(getArgSpan(), ctx, sourceClauses);
            Util.debug("  " + source);
        }

        Derivation.checkMatchWithImplicitCoercions(this, ctx, cl, source, "");
        Pair<Fact, Integer> p = ctx.subderivations.get(getArgs().getFirst());
        if (p != null) ctx.subderivations.put(this, p);
    }

    @Override
    public void run(Orchestrator orch, Context ctx) {
        super.run(orch, ctx);

        Clause cl = this.getClause();

        List<ClauseUse> sourceClauses = new ArrayList<>();
        for (Fact f : this.getArgs()) {
            if (f instanceof Derivation) {
                sourceClauses.add((ClauseUse) f.getElement());
                continue;
            }
            ErrorHandler.error(Errors.ANDOR_NOSYNTAX, f.getName(), this);
        }
        Util.verify(!sourceClauses.isEmpty(), "should have at least one");
        ClauseUse source = sourceClauses.getFirst();
        if (sourceClauses.size() > 1) {
            Util.debug("Making and clause for " + sourceClauses);
            source = AndClauseUse.makeAndClause(getArgSpan(), ctx, sourceClauses);
            Util.debug("  " + source);
        }

        Derivation.checkMatchWithImplicitCoercions(this, ctx, cl, source, "");
        Pair<Fact, Integer> p = ctx.subderivations.get(getArgs().getFirst());
        if (p != null) ctx.subderivations.put(this, p);
    }
}