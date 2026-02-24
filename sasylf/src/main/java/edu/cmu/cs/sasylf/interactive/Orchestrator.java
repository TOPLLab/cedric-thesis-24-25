package edu.cmu.cs.sasylf.interactive;

import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import edu.cmu.cs.sasylf.ast.Context;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.parser.ParseException;
import edu.cmu.cs.sasylf.types.Request;
import edu.cmu.cs.sasylf.types.Response;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.Report;
import edu.cmu.cs.sasylf.util.SASyLFError;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

public class Orchestrator {
    private final BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));

    private void emitContext(Context ctx) throws InvalidProtocolBufferException {
        var reports = ErrorHandler.getReports();
        var errorReports = reports.stream()
                .filter(Report::isError)
                .map(Report::getMessage)
                .toList();
        var waringReports = reports
                .stream()
                .filter(Predicate.not(Report::isError))
                .map(Report::getMessage)
                .toList();


        var responsePb = Response.newBuilder()
                .setContext(ctx.toTypePb())
                .addAllWarnings(waringReports)
                .build();
        String jsonOutput = JsonFormat.printer()
                .preservingProtoFieldNames()
                // NOTE: The client assumes the json struct is on a single line.
                .omittingInsignificantWhitespace()
                .print(responsePb);
        System.out.println(jsonOutput);

        // If any error occurs, exit
        if (!errorReports.isEmpty()) {
            System.exit(1); // Plugin will start a new process
        }

        reports.clear(); // Clear the reports so we don't keep reporting already reported problems
    }

    private void logErrors() throws InvalidProtocolBufferException {
        var reports = ErrorHandler.getReports();
        var errorReports = reports.stream()
                .filter(Report::isError)
                .map(Report::getMessage)
                .toList();
        var waringReports = reports
                .stream()
                .filter(Predicate.not(Report::isError))
                .map(Report::getMessage)
                .toList();

        var responsePb = Response.newBuilder()
                .addAllErrors(errorReports)
                .addAllWarnings(waringReports)
                .build();
        String jsonOutput = JsonFormat.printer()
                .preservingProtoFieldNames()
                // NOTE: The client assumes the json struct is on a single line.
                .omittingInsignificantWhitespace()
                .print(responsePb);
        System.out.println(jsonOutput);

        System.exit(1); // Plugin will start a new process
    }

    private void logParseExceptions(List<ParseException> exceptions) throws InvalidProtocolBufferException {
        var responsePb = Response.newBuilder();
        for (var e : exceptions) {
            responsePb.addErrors(e.toString());
        }
        String jsonOutput = JsonFormat.printer()
                .preservingProtoFieldNames()
                // NOTE: The client assumes the json struct is on a single line.
                .omittingInsignificantWhitespace()
                .print(responsePb);
        System.out.println(jsonOutput);
        System.exit(1); // Plugin will start a new process
    }

    /// Try all parseFns until one succeeds. If failed, read again
    public final void runNextNode(Context ctx, Delegate... delegates) {
        try {
            if (ctx != null) {
                this.emitContext(ctx);
            }

            var input = reader.readLine();
            var requestBuilder = Request.newBuilder();
            JsonFormat.parser().merge(input, requestBuilder);
            var request = requestBuilder.build();

            if (request.hasInput()) {
                final var buffer = request.getInput().getInput();
                final var inputByteStream = new ByteArrayInputStream(buffer.getBytes());
                final var parser = new DSLToolkitParser(inputByteStream, "UTF-8");

                var exceptions = new ArrayList<ParseException>();

                for (final var parseFn : delegates) {
                    try {
                        if (ctx != null) {
                            parseFn.finalize(ctx.clone(), parser);
                        } else {
                            parseFn.finalize(null, parser);
                        }
                        return;
                    } catch (ParseException e) {
                        exceptions.add(e);
                    } catch (SASyLFError e) {
                        logErrors();
                    }
                }

                this.logParseExceptions(exceptions);
            } else if (request.hasQuit()) {
                System.exit(request.getQuit().getCode());
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
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
