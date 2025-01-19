package edu.cmu.cs.sasylf.interactive;

import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.parser.Token;
import edu.cmu.cs.sasylf.util.Either;

import java.io.*;
import java.util.ArrayList;

public class InteractiveParser {
    public record Result<T>(T node, Token rest) {}

    public interface ParseFn<T> {
        Result<T> run(DSLToolkitParser parser) throws ParseException;
    }

    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    private String inputBuffer = "";

    /// Try all parseFns until one succeeds. If failed, read again
    public final <T, U> Either<T, U> getNextNode(Context ctx, ParseFn<T> parseFn) {
        return  this.getNextNode(ctx, parseFn, null);
    }

    /// Try all parseFns until one succeeds. If failed, read again
    public final <T, U> Either<T, U> getNextNode(Context ctx, ParseFn<T> parseFirst, ParseFn<U> parseSecond) {
        assert parseFirst != null;

        while (true) {

            System.out.println(ctx.getInteractiveInfo().toPrettyString());

            // TODO: Keep parsed stuff
            // TODO: Keep context per parsed node
            // TODO: if all parser errors happen at end of input, keep input, else throw away.

            if (this.inputBuffer.isEmpty()) {
                try {
                    // TODO: use rest if present here
                    this.inputBuffer = reader.readLine();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }

            final var inputByteStream = new ByteArrayInputStream(this.inputBuffer.getBytes());
            final var parser = new DSLToolkitParser(inputByteStream, "UTF-8");

            var exceptions = new ArrayList<ParseException>();

            try {
                final var result = parseFirst.run(parser);
                this.inputBuffer = result.rest().image;
                System.out.println("this.inputBuffer = " + this.inputBuffer);
                return new Either<>(result.node(), null);
            } catch (ParseException e) {
                exceptions.add(e);
            }

            if (parseSecond != null) {
                try {
                    final var result = parseSecond.run(parser);
                    this.inputBuffer = result.rest().image;
                    System.out.println("this.inputBuffer = " + this.inputBuffer);
                    return new Either<>(null, result.node());
                } catch (ParseException e) {
                    exceptions.add(e);
                }
            }

            // TODO: put in json object
            System.err.println("No parsers succeeded parsing the input.\n\"Input: " +
                    this.inputBuffer +
                    "\"\nThe following exceptions where collected");
            for (ParseException e : exceptions) {
                System.err.println(e.getMessage());
            }

            this.inputBuffer = "";
        }
    }
}
