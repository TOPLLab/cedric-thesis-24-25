package edu.cmu.cs.sasylf.interactive;

import java.util.ArrayList;
import java.util.List;

import edu.cmu.cs.sasylf.Proof;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.ast.Theorem;
import edu.cmu.cs.sasylf.ast.TheoremPart;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.parser.Token;
import edu.cmu.cs.sasylf.util.Pair;
import edu.cmu.cs.sasylf.util.SASyLFError;

public class InteractiveProof {
  public interface ParseFn<T> {
    T run(DSLToolkitParser parser) throws ParseException;
  }

  // the currently finished proof
  private final Proof currentProof;

  // current context
  private Context currentContext;

  // interface to parser/sysin
  private final ParserInterface pi = new ParserInterface();

  public InteractiveProof(Proof proof) {
    this.currentProof = proof;
    this.currentContext = proof.getCompilationUnit().getContext();
  }

  public void run() {
    while (true) {
      try {
        Pair<Theorem, Token> pair = this.pi.getNextNode(this.currentContext, parser-> parser.TheoremHeader(false));
        Theorem currentTheorem = pair.first;

        this.currentContext = currentTheorem.run(this.pi, this.currentContext, pair.second);
        addTheoremToProof(currentTheorem);
      } catch (ParseException e) {
        // TODO: Put errors in json object
        System.out.println(e.getMessage());
      }
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
