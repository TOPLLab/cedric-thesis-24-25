package edu.cmu.cs.sasylf.ast;

import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Location;
import edu.cmu.cs.sasylf.util.Span;
import edu.cmu.cs.sasylf.util.Util;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.function.Consumer;


public abstract class Node implements Span {
    private Location location;
    private Location endLocation;

    public Node() {
    }

    public Node(Location l) {
        this(l, l);
    }

    public Node(Location l1, Location l2) {
        location = l1;
        endLocation = l2;
        ErrorHandler.recordLastSpan(this);
    }

    @Override
    public Location getLocation() {
        return location;
    }

    protected void setLocation(Location l) {
        location = l;
        if (endLocation == null) endLocation = l;
    }

    @Override
    public Location getEndLocation() {
        return endLocation;
    }

    public void setEndLocation(Location l) {
        endLocation = l;
    }

    public abstract void prettyPrint(PrintWriter out);

    @Override
    public String toString() {
        StringWriter sw = new StringWriter();
        prettyPrint(new PrintWriter(sw));
        return sw.toString();
    }

    protected void tdebug(Object... args) {
        Util.tdebug(args);
    }

    /**
     * Collect all {@link QualName}s using the given consumer.
     *
     * @param consumer The consumer that accepts conditions based on the given {@link QualName}.
     */
    public void collectQualNames(Consumer<QualName> consumer) {
        // nothing
    }
    // TODO: Look into putting a base class here
    //	abstract public ObjectNode getInteractiveInfo();
}
