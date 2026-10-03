import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpPage } from "../pages/SignUpPage";
import { LoginPage } from "../pages/LoginPage";
import { AuthProvider } from "../context/AuthContext";

describe("Auth Pages", () => {
  it("SignUpPage validates required Full Name", async () => {
    const onNavigate = vi.fn();
    render(
      <AuthProvider>
        <SignUpPage onNavigate={onNavigate} />
      </AuthProvider>
    );

    const submitBtn = screen.getByText("Create Account");
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please enter your name.")).toBeDefined();
  });

  it("SignUpPage validates valid email format", async () => {
    const onNavigate = vi.fn();
    render(
      <AuthProvider>
        <SignUpPage onNavigate={onNavigate} />
      </AuthProvider>
    );

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Vitalik Buterin" } });

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "notanemail" } });

    const submitBtn = screen.getByText("Create Account");
    const form = submitBtn.closest("form")!;
    fireEvent.submit(form);

    expect(await screen.findByText("Please enter a valid email address.")).toBeDefined();
  });

  it("SignUpPage validates password length >= 8", async () => {
    const onNavigate = vi.fn();
    render(
      <AuthProvider>
        <SignUpPage onNavigate={onNavigate} />
      </AuthProvider>
    );

    const nameInput = screen.getByLabelText("Full Name");
    fireEvent.change(nameInput, { target: { value: "Vitalik Buterin" } });

    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "vitalik@ethereum.org" } });

    const passInput = screen.getByLabelText("Password");
    fireEvent.change(passInput, { target: { value: "123" } });

    const submitBtn = screen.getByText("Create Account");
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeDefined();
  });

  it("LoginPage requires email and password", async () => {
    const onNavigate = vi.fn();
    render(
      <AuthProvider>
        <LoginPage onNavigate={onNavigate} />
      </AuthProvider>
    );

    const submitBtn = screen.getByText("Login");
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please enter your email address.")).toBeDefined();
  });
});
