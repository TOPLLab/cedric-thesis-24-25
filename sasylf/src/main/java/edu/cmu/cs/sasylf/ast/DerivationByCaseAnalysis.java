package edu.cmu.cs.sasylf.ast;

import edu.cmu.cs.sasylf.interactive.Orchestrator;
import edu.cmu.cs.sasylf.types.Fact;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Errors;
import edu.cmu.cs.sasylf.util.Location;


public class DerivationByCaseAnalysis extends DerivationByAnalysis {
    public DerivationByCaseAnalysis(String n, Location l, Clause c, String derivName) {
        super(n, l, c, derivName);
    }

    public DerivationByCaseAnalysis(String n, Location l, Clause c, Clause subject) {
        super(n, l, c, subject);
    }

    @Override
    public String byPhrase() {
        return "case analysis";
    }

    @Override
    public void typecheck(Context ctx) {
        if (getArgStrings().size() != 1) {
            ErrorHandler.recoverableError(Errors.CASE_SUBJECT_MULTIPLE, this);
        }
        super.typecheck(ctx);
    }

    @Override
    public void run(Orchestrator orch, Context ctx) {
        super.epilogueParseFn = (parser) -> parser.CaseAnalysisJustificationEpilogue(this);

        if (getArgStrings().size() != 1) {
            ErrorHandler.recoverableError(Errors.CASE_SUBJECT_MULTIPLE, this);
        }
        super.run(orch, ctx);
    }

    public Fact toTypePb() {
        return super.toTypePb();
    }


}
