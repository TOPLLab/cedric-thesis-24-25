package edu.cmu.cs.sasylf.util;

public  class Either<T, U> {
    private final T first;
    private final U second;

    public Either(T first, U second) {
        assert first != null && second == null || first == null && second != null;
        this.first = first;
        this.second=second;
    }

    public T getFirst() {
        return first;
    }

    public U getSecond() {
        return second;
    }
}