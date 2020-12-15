package edu.cmu.cs.sasylf;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import edu.cmu.cs.sasylf.module.ModuleFinder;
import edu.cmu.cs.sasylf.module.PathModuleFinder;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.ErrorReport;
import edu.cmu.cs.sasylf.util.Errors;
import edu.cmu.cs.sasylf.util.Report;
import edu.cmu.cs.sasylf.util.SASyLFError;
import edu.cmu.cs.sasylf.util.Util;

public class ErrorCoverage {

	public static void main(String[] args) {
		ModuleFinder mf = new PathModuleFinder("");
		Util.SHOW_TASK_COMMENTS = false;
		Util.COMP_WHERE = true;
		Util.EXTRA_ERROR_INFO = false;
		Util.VERBOSE = false;
		Util.PRINT_ERRORS = false;
		Util.PRINT_SOLVE = false;
		
		Map<Errors,List<String>> index = new HashMap<>();
		Set<Errors> encountered = index.keySet();
		for (String s : args) {
			File f = new File(s);
			try (Reader r = new FileReader(f)) {
				Main.parseAndCheck(mf, s, null, r);
			} catch (FileNotFoundException e) {
				System.err.println("Unable to open '" + s + "': " + e.getLocalizedMessage());
			} catch (IOException e) {
				System.err.println("Error reading '" + s + "': " + e.getLocalizedMessage());
			} catch (SASyLFError e) {
				// already handled
			} catch (RuntimeException e) {
				System.out.println("While checking " + s);
				e.printStackTrace();
			}
			Collection<Report> reports = ErrorHandler.getReports();
			String shortName = f.getName();
			for (Report r : reports) {
				if (r instanceof ErrorReport) {
					ErrorReport er = (ErrorReport)r;
					final Errors type = er.getErrorType();
					if (type == Errors.INTERNAL_ERROR) {
						System.err.println(r.formatMessage());
						if (er.getExtraInformation() != null) {
							System.err.println("  " + er.getExtraInformation());
						}
					}
					List<String> located = index.get(type);
					if (located == null) {
						located = new ArrayList<>();
						index.put(type, located);
					}
					located.add(shortName);
				}
				r.getMessage();
			}
		}
		for (Errors error : Errors.values()) {
			System.out.print(error);
			List<String> located = index.get(error);
			if (located == null || located.isEmpty()) {
				System.out.println(" [no examples]");
			} else {
				int i = 0;
				for (String s : located) {
					if (++i > 5) {
						System.out.print(" ...");
						break;
					}
					System.out.print(" " + s);
				}
				System.out.println();
			}
		}
		System.out.println("Error types generated: " + encountered.size());
		System.out.println("Error types never generated: " + (Errors.values().length - encountered.size()));
	}
}