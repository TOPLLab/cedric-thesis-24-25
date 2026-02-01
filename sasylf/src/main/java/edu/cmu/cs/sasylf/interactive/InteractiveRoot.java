package edu.cmu.cs.sasylf.interactive;

import edu.cmu.cs.sasylf.ast.CompUnit;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.module.ModuleFinder;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;

public class InteractiveRoot {

    // interface to parser/stdin
    private final Orchestrator orch = new Orchestrator();
    // current compilation unit
    private CompUnit currentUnit;

    private ModuleFinder mf;

    public InteractiveRoot(ModuleFinder mf) {
        this.mf = mf;
    }

    public void run() {
        this.orch.runNextNode(
                null,
                new Orchestrator.Delegate<>(DSLToolkitParser::InteractiveUnit) {
                    @Override
                    public void run(Context ctx, CompUnit unit) {
                        currentUnit = unit;
                        currentUnit.run(orch, mf, null);
                    }
                }
        );
    }
}
