package edu.cmu.cs.sasylf.interactive;

import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;

import java.io.*;
import java.util.ArrayList;

public class ParserInterface {
    private final DSLToolkitParser parser = new DSLToolkitParser(System.in, "UTF-8");
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    /// Try all parseFns until one succeeds. If failed, read again
    @SafeVarargs
    public final <T> T getNextNode(Context ctx, InteractiveProof.ParseFn<T>... parseFns) {
        String input;
        while (true) {
            System.out.println(ctx.getInteractiveInfo().toPrettyString());

            try {
                // TODO: use rest if present here
                input = reader.readLine();
                parser.ReInit(new ByteArrayInputStream(input.getBytes()));
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

            var exceptions = new ArrayList<ParseException>();
            for (InteractiveProof.ParseFn<T> parseFn : parseFns) {
                try {
                    // TODO: Keep track of rest here
                    return parseFn.run(parser);
                } catch (ParseException e) {
                    // TODO: Throw away rest here
                    exceptions.add(e);
                }
            }

            // TODO: put in json object
            System.err.println("No parsers succeeded parsing the input.\n\"Input: " +
                    input +
                    "\"\nThe following exceptions where collected");
            for (ParseException e : exceptions) {
                System.err.println(e.getMessage());
            }
        }
    }
}
