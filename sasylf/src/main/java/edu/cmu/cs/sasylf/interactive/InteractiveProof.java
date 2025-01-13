package edu.cmu.cs.sasylf.interactive;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
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

  // the currently finished proof
  private Proof currentProof;

  // current context
  private Context currentContext;

  // buffered reader for reading input
  private final BufferedReader d = new BufferedReader(new InputStreamReader(System.in));

  public InteractiveProof(Proof proof) {
    this.currentProof = proof;
    this.currentContext = proof.getCompilationUnit().getContext();
  }

  public InputStream getNextCommand(Context ctx) throws QuitException {
    try {
      System.out.println(ctx.getInteractiveInfo().toPrettyString());

      // TODO: Remove this print
      System.out.print("> ");
      String input = d.readLine();

      // TODO: This is also CLI specific
      if (input.equals("quit")) {
        throw new QuitException();
      }

      return new ByteArrayInputStream(input.getBytes());
    } catch (IOException e) {
      System.err.println("Error: " + e.getMessage());
      return null;
    }
  }

  public void run() {
    while (true) {
      try {
        InputStream inputCommand = getNextCommand(currentContext);
        DSLToolkitParser parser = new DSLToolkitParser(inputCommand, "UTF-8");

        Pair<Theorem, Token> pair = parser.TheoremHeader(false);
        Theorem currentTheorem = pair.first;

        currentContext = currentTheorem.run(this, currentContext, pair.second);
        addTheoremToProof(currentTheorem);
      } catch (ParseException e) {
        // TODO: Put errors in json object
        System.out.println(e.getMessage());
      } catch (QuitException e) {
        break;
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
