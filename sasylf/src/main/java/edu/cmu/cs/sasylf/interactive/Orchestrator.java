package edu.cmu.cs.sasylf.interactive;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;

import java.io.*;
import java.util.ArrayList;

public class Orchestrator {
    public interface ParseFn<T> {
        T run(DSLToolkitParser parser) throws ParseException;
    }

    public abstract static class Delegate<T> {
        ParseFn<T> parser;

        public Delegate(ParseFn<T> parser) {
            this.parser = parser;
        }

        void finalize(Context ctx, DSLToolkitParser parser) throws ParseException {
            var v = this.parser.run(parser);
            this.run(ctx, v);
        }

        /// Use the result of the parser if it passes
        public abstract void run(Context ctx, T value) throws ParseException;
    }

    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    /// Try all parseFns until one succeeds. If failed, read again
    public final void runNextNode(Context ctx, Delegate...delegates) {
        final var mapper = new ObjectMapper();
        JsonNode node;

        while (true) {

            System.out.println(ctx.getInteractiveInfo().toPrettyString());

            // TODO: Keep parsed stuff
            // TODO: Keep context per parsed node
            // TODO: if all parser errors happen at end of input, keep input, else throw away.

            var input = "";

            try {
                // TODO: use rest string if present here
                input = reader.readLine();
                node = mapper.readTree(input);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

            final var buffer = node.get("input").asText();
            final var inputByteStream = new ByteArrayInputStream(buffer.getBytes());
            final var parser = new DSLToolkitParser(inputByteStream, "UTF-8");

            var exceptions = new ArrayList<ParseException>();

            for (final var parseFn : delegates) {
                try {
                    parseFn.finalize(ctx.clone(), parser);
                    return;
                } catch (ParseException e) {
                    exceptions.add(e);
                }
            }

            var rootNode = mapper.createObjectNode();

            var errorsNode = mapper.createArrayNode();
            for (ParseException e : exceptions) {
                errorsNode.add(e.toString());
            }
            rootNode.set("errors", errorsNode);
            System.out.println(rootNode.toPrettyString());
        }
    }
}
