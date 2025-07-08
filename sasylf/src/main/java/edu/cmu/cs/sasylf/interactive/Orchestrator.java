package edu.cmu.cs.sasylf.interactive;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.ErrorReport;
import edu.cmu.cs.sasylf.util.Report;
import edu.cmu.cs.sasylf.util.SASyLFError;

import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

public class Orchestrator {
    private int messageId = 0;
    public interface ParseFn<T> {
        T run(DSLToolkitParser parser) throws ParseException;
    }

    public abstract static class Delegate<T> {
        ParseFn<T> parserFn;

        public Delegate(ParseFn<T> parserFn) {
            this.parserFn = parserFn;
        }

        void finalize(Context ctx, DSLToolkitParser parser) throws ParseException {
            var v = this.parserFn.run(parser);
            this.run(ctx, v);
        }

        /// Use the result of the parser if it passes
        public abstract void run(Context ctx, T value) throws ParseException;
    }

    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    private void logContext(Context ctx) {
        final var mapper = new ObjectMapper();
        var ctxNode = mapper.createObjectNode();

        ctxNode.put("id", this.messageId++);
        ctxNode.put("type", "context");
        ctxNode.set("context", ctx.getInteractiveInfo());
        System.out.println(ctxNode);
    }

    private void logErrorReports(List<Report> reports) {
        final var mapper = new ObjectMapper();

        var rootNode = mapper.createObjectNode();

        var reportsNode = mapper.createArrayNode();
        for (var r : reports) {
            reportsNode.add(r.toString());
        }
        rootNode.put("type", "reports");
        rootNode.set("reports", reportsNode);
        System.out.println(rootNode);
    }

    private void logParseExceptions(List<ParseException> exceptions) {
        final var mapper = new ObjectMapper();

        var rootNode = mapper.createObjectNode();

        var errorsNode = mapper.createArrayNode();
        for (var e : exceptions) {
            errorsNode.add(e.toString());
        }
        rootNode.put("type", "errors");
        rootNode.set("errors", errorsNode);
        System.out.println(rootNode);
    }

    /// Try all parseFns until one succeeds. If failed, read again
    public final void runNextNode(Context ctx, Delegate...delegates) {
        final var mapper = new ObjectMapper();
        JsonNode node;

        this.logContext(ctx);

        while (true) {

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

            this.logParseExceptions(exceptions);
        }
    }
}
