package edu.cmu.cs.sasylf.interactive;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import edu.cmu.cs.sasylf.Proof;
import edu.cmu.cs.sasylf.ast.*;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.parser.Token;
import edu.cmu.cs.sasylf.util.Pair;
import edu.cmu.cs.sasylf.util.SASyLFError;

public class InteractiveProof {
  // the currently finished proof
  private final Proof currentProof;

  // current context
  private Context currentContext;

  // interface to parser/sysin
  private final Orchestrator orch = new Orchestrator();

  public InteractiveProof(Proof proof) {
    this.currentProof = proof;
    this.currentContext = proof.getCompilationUnit().getContext();
  }

  public void run() {
    while (true) {
        this.orch.runNextNode(this.currentContext, new Orchestrator.Delegate<>(parser -> parser.TheoremPrologue(false)) {
          @Override
          public void run(Context ctx, Pair<Theorem, Token> pair) throws ParseException {
            currentContext = pair.first.run(orch, ctx, pair.second);
            List<Theorem> thms = new ArrayList<>();
            thms.add(pair.first);
            var part = new TheoremPart(thms);
            addPartToProof(part);
          }
        }, new Orchestrator.Delegate<>(parser -> parser.PartInteractive(false)) {
          @Override
          public void run(Context ctx, Part part) {
            addPartToProof(part);
          }
        });
    }
  }

  private void addPartToProof(Part part) {
    currentProof.getCompilationUnit().addChunk(part);
    // TODO do this and other context related stuff in orchestrator so that it can be rolled back correctly
    if (currentProof.getCompilationUnit().typecheck()) {
      // reset the current context to the context of the current proof
      currentContext = currentProof.getCompilationUnit().getContext();
    }
  }

}
