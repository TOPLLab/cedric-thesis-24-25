package edu.cmu.cs.sasylf.term;

import edu.cmu.cs.sasylf.util.Pair;

import java.util.Queue;


public class Constant extends Atom {
    public static final Constant TYPE = new Constant();
    public static final Constant UNKNOWN_TYPE = new Constant("UNKNOWN_TYPE", TYPE);
    Term type;

    public Constant(String n, Term type) {
        super(n);
        this.type = type;
    }

    private Constant() {
        super("TYPE");
        this.type = this;
    }

    @Override
    public Term getType() {
        return type;
    }

    /**
     * performs a unification, or fails throwing exception, then calls instanceHelper
     * to continue.  The current substitution is applied lazily.
     */
    @Override
    void unifyCase(Term other, Substitution current, Queue<Pair<Term, Term>> worklist) {
        // other term must be equal to me, otherwise fail
        if (equals(other))
            Term.unifyHelper(current, worklist);
        else
            throw new UnificationFailed("Atoms differ: " + this + " and " + other, this, other);
    }
}
