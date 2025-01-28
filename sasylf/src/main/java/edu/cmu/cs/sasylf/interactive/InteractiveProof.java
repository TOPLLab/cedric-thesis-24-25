package edu.cmu.cs.sasylf.interactive;

import java.util.ArrayList;
import java.util.List;

import edu.cmu.cs.sasylf.Proof;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.ast.Theorem;
import edu.cmu.cs.sasylf.ast.TheoremPart;
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
  private final Orchestrator pi = new Orchestrator();

  public InteractiveProof(Proof proof) {
    this.currentProof = proof;
    this.currentContext = proof.getCompilationUnit().getContext();
  }

  public void run() {
    while (true) {
        this.pi.runNextNode(this.currentContext, new Orchestrator.Delegate<>(parser-> parser.TheoremPrologue(false)) {
          @Override
          public void run(Context ctx, Pair<Theorem, Token> pair) throws ParseException {
            currentContext = pair.first.run(pi, currentContext, pair.second);
            addTheoremToProof(pair.first);
          }
        });
    }
  }

  private void typeCheckCurrentProof() {
    try {
      boolean typeChecks = currentProof.getCompilationUnit().typecheck();
      if (typeChecks) {
        System.out.println("Proof with new theorem type checked ... ");
      }else{
        System.out.println("Proof not valid");
      }
    } catch (SASyLFError e) {
      System.err.println(
          "Error while check compilation unit ... : " + e.getMessage());
      System.exit(-1);
    }
  }

  private void addTheoremToProof(Theorem theorem) {
    List<Theorem> lst = new ArrayList<Theorem>();
    lst.add(theorem);
    currentProof.getCompilationUnit().addChunk(new TheoremPart(lst));
    typeCheckCurrentProof();
    // reset the current context to the context of the current proof
    currentContext = currentProof.getCompilationUnit().getContext();
  }

}
