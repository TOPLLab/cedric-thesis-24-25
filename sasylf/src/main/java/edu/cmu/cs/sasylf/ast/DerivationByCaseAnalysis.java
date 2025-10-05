package edu.cmu.cs.sasylf.ast;

import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.cmu.cs.sasylf.interactive.Orchestrator;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Errors;
import edu.cmu.cs.sasylf.util.Location;



public class DerivationByCaseAnalysis extends DerivationByAnalysis {
	public DerivationByCaseAnalysis(String n, Location l, Clause c, String derivName) {
		super(n,l,c, derivName);
	}
	public DerivationByCaseAnalysis(String n, Location l, Clause c, Clause subject) {
		super(n,l,c,subject);
	}

	@Override
	public String byPhrase() { return "case analysis"; }

	@Override
	public void typecheck(Context ctx) {
		if (getArgStrings().size() != 1) {
			ErrorHandler.recoverableError(Errors.CASE_SUBJECT_MULTIPLE, this);
		}
		super.typecheck(ctx);
	}

    @Override
    public void run(Orchestrator orch, Context ctx) {
        this.epilogueParseFn = (parser) -> parser.CaseAnalysisJustificationEpilogue(this);

        if (getArgStrings().size() != 1) {
            ErrorHandler.recoverableError(Errors.CASE_SUBJECT_MULTIPLE, this);
        }
        super.run(orch, ctx);
    }

    public ObjectNode getInteractiveInfo() {
//		var mapper = new ObjectMapper();
//		var rootNode = mapper.createObjectNode();

        // TODO: describe by case analysis on ...

//		return rootNode;
        return super.getInteractiveInfo();
    }


}
