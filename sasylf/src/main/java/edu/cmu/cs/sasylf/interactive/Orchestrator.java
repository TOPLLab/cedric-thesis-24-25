package edu.cmu.cs.sasylf.interactive;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.types.Errors;
import edu.cmu.cs.sasylf.types.Response;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class Orchestrator {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    private void emitContext(Context ctx) throws InvalidProtocolBufferException {
        var ctxPb = ctx.toTypePb();
        var responsePb = Response.newBuilder()
                .setContext(ctxPb)
                .build();
        String jsonOutput = JsonFormat.printer()
                .preservingProtoFieldNames()
                // NOTE: The client assumes the json struct is on a single line.
                .omittingInsignificantWhitespace()
                .print(responsePb);
        System.out.println(jsonOutput);
    }

//    private void logErrorReports(List<Report> reports) {
//        final var mapper = new ObjectMapper();
//
//        var rootNode = mapper.createObjectNode();
//
//        var reportsNode = mapper.createArrayNode();
//        for (var r : reports) {
//            reportsNode.add(r.toString());
//        }
//        rootNode.put("type", "reports");
//        rootNode.set("reports", reportsNode);
//        System.out.println(rootNode);
//    }

    private void logParseExceptions(List<ParseException> exceptions) throws InvalidProtocolBufferException {
        var errorsPb = Errors.newBuilder();
        for (var e : exceptions) {
            errorsPb.addErrors(e.toString());
        }

        var responsePb = Response.newBuilder()
                .setErrors(errorsPb)
                .build();
        String jsonOutput = JsonFormat.printer()
                .preservingProtoFieldNames()
                // NOTE: The client assumes the json struct is on a single line.
                .omittingInsignificantWhitespace()
                .print(responsePb);
        System.out.println(jsonOutput);
    }

    /// Try all parseFns until one succeeds. If failed, read again
    public final void runNextNode(Context ctx, Delegate... delegates) {
        final var mapper = new ObjectMapper();
        JsonNode node;

        try {
            this.emitContext(ctx);
        } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException(e);
        }

        while (true) {
            try {
                var input = reader.readLine();
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

            try {
                this.logParseExceptions(exceptions);
            } catch (InvalidProtocolBufferException e) {
                throw new RuntimeException(e);
            }
        }
    }

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
}
