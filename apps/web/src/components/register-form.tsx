"use client";

import { Alert, Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthShell } from "./auth-shell";
import { passwordRules } from "../lib/auth-validation";
import { AuthResponse, apiPost } from "../lib/api";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [isPending, setIsPending] = useState(false);

  const redirectPath = searchParams.get("redirect");
  const loginHref = useMemo(() => {
    return redirectPath
      ? `/login?redirect=${encodeURIComponent(redirectPath)}`
      : "/login";
  }, [redirectPath]);

  async function onFinish(values: RegisterFormValues) {
    setMessage("");
    setIsPending(true);

    try {
      await apiPost<AuthResponse>("/api/auth/register", {
        name: values.name,
        email: values.email,
        password: values.password,
      });
      router.push(loginHref);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng ký thất bại.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AuthShell
      title="Đăng ký"
      description="Tạo tài khoản để bắt đầu đặt vé, theo dõi lịch sử giao dịch và tiếp tục thanh toán."
      imageUrl="register_background.avif"
    >
      <Form<RegisterFormValues>
        layout="vertical"
        onFinish={onFinish}
        disabled={isPending}
        requiredMark={false}
        className="[&_.ant-form-item-label>label]:text-sm [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item]:mb-5"
      >
        <Form.Item
          label="Họ và tên"
          name="name"
          rules={[
            { required: true, message: "Vui lòng nhập họ và tên." },
            { max: 100, message: "Họ và tên tối đa 100 ký tự." },
          ]}
        >
          <Input
            name="name"
            size="large"
            autoComplete="name"
            placeholder="Nguyễn Văn A"
            className="rounded-[14px] px-4"
          />
        </Form.Item>

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
            autoComplete="new-password"
            placeholder="Abc@123456"
            className="rounded-[14px] px-4"
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isPending}
        >
          Đăng ký
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
        Đã có tài khoản?{" "}
        <Link className="font-extrabold text-slate-950" href={loginHref}>
          Đăng nhập
        </Link>
      </Typography.Paragraph>
    </AuthShell>
  );
}
