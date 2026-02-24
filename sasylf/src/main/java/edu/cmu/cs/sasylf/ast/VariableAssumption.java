package edu.cmu.cs.sasylf.ast;

import edu.cmu.cs.sasylf.types.Fact;
import edu.cmu.cs.sasylf.types.VariableAssumptionFact;
import edu.cmu.cs.sasylf.util.Location;

import java.io.PrintWriter;
import java.io.StringWriter;

public class VariableAssumption extends SyntaxAssumption {

    private Variable variable;

    public VariableAssumption(String n, Location l, Element assumes) {
        super(n, l, assumes);
        variable = new Variable(n, l);
    }

    public VariableAssumption(Variable v) {
        super(v.getSymbol(), v.getLocation(), null);
        variable = v;
    }

    @Override
    public Element getElementBase() {
        return variable;
    }

    @Override
    public Fact toTypePb() {
        var builder = VariableAssumptionFact.newBuilder();

        builder.setName(this.getName());

//        var esw = new StringWriter();
//        var epw = new PrintWriter(esw);
//        this.getElement().prettyPrint(epw);
//        builder.setElement(esw.toString());

        var csw = new StringWriter();
        var cpw = new PrintWriter(csw);
        this.variable.prettyPrint(cpw);
        builder.setVariable(csw.toString());

        var factBuilder = edu.cmu.cs.sasylf.types.Fact.newBuilder().setVariableAssumptionFact(builder);
        return factBuilder.build();
    }
}
