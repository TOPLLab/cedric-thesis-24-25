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

  // interface to parser/stdin
  private final Orchestrator orch = new Orchestrator();

  public InteractiveProof(Proof proof) {
    this.currentProof = proof;
    this.currentContext = proof.getCompilationUnit().getContext();
  }

  public void run() {
    var thmPrologDelegate = new Orchestrator.Delegate<>(parser -> parser.TheoremPrologue(false)) {
      @Override
      public void run(Context ctx, Pair<Theorem, Token> pair) {
        currentContext = pair.first.run(orch, ctx, pair.second);
        List<Theorem> theorems = new ArrayList<>();
        theorems.add(pair.first);
        var part = new TheoremPart(theorems);
        addPartToProof(part);
      }
    };

    var partDelegate = new Orchestrator.Delegate<>(parser -> parser.PartInteractive(false)) {
      @Override
      public void run(Context ctx, Part part) {
        addPartToProof(part);
      }
    };

    // May start with a package declaration but should occur nowhere else.
    this.orch.runNextNode(this.currentContext, new Orchestrator.Delegate<>(DSLToolkitParser::PackageDeclaration) {
      @Override
      public void run(Context ctx, PackageDeclaration value) {
        // ignore for now
      }
    }, thmPrologDelegate, partDelegate);

    while (true) {
        this.orch.runNextNode(this.currentContext, thmPrologDelegate, partDelegate);
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
