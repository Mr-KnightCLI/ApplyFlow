package com.applyflow.application;

public class ApplicationNotFoundException extends RuntimeException {
    public ApplicationNotFoundException(long id) { super("Application " + id + " was not found"); }
}
