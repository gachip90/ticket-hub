"use client";

import { Alert, Button, Checkbox, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthShell } from "./auth-shell";
import { passwordRules } from "../lib/auth-validation";
import { AuthResponse, apiPost, storeAuthSession } from "../lib/api";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const redirectPath = searchParams.get("redirect") ?? "/";
  const registerHref = useMemo(() => {
    return redirectPath === "/"
      ? "/register"
      : `/register?redirect=${encodeURIComponent(redirectPath)}`;
  }, [redirectPath]);

  async function onFinish(values: LoginFormValues) {
    setMessage("");
    setIsPending(true);

    try {
      const auth = await apiPost<AuthResponse>("/api/auth/login", {
        email: values.email,
        password: values.password,
      });
      storeAuthSession(auth);
      router.push(redirectPath);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Đăng nhập thất bại.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AuthShell
      title="Đăng nhập"
      description="Đăng nhập để tiếp tục khám phá sự kiện và hoàn tất hành trình đặt vé của bạn"
      imageUrl="login_background.avif"
    >
      <Form<LoginFormValues>
        layout="vertical"
        onFinish={onFinish}
        disabled={isPending}
        requiredMark={false}
        className="[&_.ant-form-item-label>label]:text-sm [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item]:mb-5"
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: "Vui lòng nhập email." },
            { type: "email", message: "Email không hợp lệ." },
          ]}
        >
          <Input
            name="email"
            size="large"
            autoComplete="email"
            placeholder="example@email.com"
            className="rounded-[14px] px-4"
          />
        </Form.Item>

        <Form.Item label="Mật khẩu" name="password" rules={passwordRules}>
          <Input.Password
            name="password"
            size="large"
            autoComplete="current-password"
            placeholder="Abc@123456"
            className="rounded-[14px] px-4"
          />
        </Form.Item>

        <Form.Item className="mb-6">
          <Checkbox>Ghi nhớ đăng nhập</Checkbox>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isPending}
        >
          Đăng nhập
        </Button>

        {message ? (
          <Alert
            className="mt-5 rounded-2xl"
            type="error"
            title={message}
            showIcon
          />
        ) : null}
      </Form>

      <Typography.Paragraph className="mb-0 mt-7 text-center text-[15px] text-slate-500">
        Chưa có tài khoản?{" "}
        <Link className="font-extrabold text-slate-950" href={registerHref}>
          Tạo tài khoản
        </Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}
