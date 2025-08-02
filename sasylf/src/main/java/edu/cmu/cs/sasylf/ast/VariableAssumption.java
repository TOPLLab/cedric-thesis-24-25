package edu.cmu.cs.sasylf.ast;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import edu.cmu.cs.sasylf.util.Location;

import java.io.PrintWriter;
import java.io.StringWriter;

public class VariableAssumption extends SyntaxAssumption {

	public VariableAssumption(String n, Location l, Element assumes) {
		super(n, l, assumes);
		variable = new Variable(n,l);
	}

	public VariableAssumption(Variable v) {
		super(v.getSymbol(),v.getLocation(),null);
		variable = v;
	}

	@Override
	public Element getElementBase() {
		return variable;
	}

	private Variable variable;


	@Override
	public ObjectNode getInteractiveInfo() {
		var mapper = new ObjectMapper();
		var rootNode = mapper.createObjectNode();

		rootNode.put("fact", "VariableAssumption");
		rootNode.put("name", this.getName());

		var esw = new StringWriter();
		var epw = new PrintWriter(esw);
		this.getElement().prettyPrint(epw);
		rootNode.put("element", esw.toString());

		var csw = new StringWriter();
		var cpw = new PrintWriter(csw);
		this.variable.prettyPrint(cpw);
		rootNode.put("variable", csw.toString());

		return rootNode;
	}
}
