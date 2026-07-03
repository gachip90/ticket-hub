import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';

type PaymentConfirmationItem = {
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PaymentConfirmationEmailPayload = {
  concertName: string;
  orderCode: string;
  userEmail: string;
  recipientEmail: string;
  recipientName: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: PaymentConfirmationItem[];
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });

  async sendPaymentConfirmationEmail(payload: PaymentConfirmationEmailPayload) {
    const from = process.env.SMTP_FROM ?? 'no-reply@tickethub.local';
    const subject = `[Ticket Hub] Xác nhận thanh toán ${payload.orderCode}`;
    const ticketLines = payload.items
      .map(
        (item) =>
          `${item.ticketTypeName} x${item.quantity} - ${this.formatCurrency(item.lineTotal)}`,
      )
      .join('\n');

    await this.transporter.sendMail({
      from,
      to: payload.recipientEmail,
      subject,
      text: [
        'Xác nhận thanh toán Ticket Hub',
        '',
        `Đêm nhạc: ${payload.concertName}`,
        `Mã đơn hàng: ${payload.orderCode}`,
        `Email người đặt: ${payload.userEmail}`,
        `Người nhận vé: ${payload.recipientName} <${payload.recipientEmail}>`,
        `Chi tiết vé:\n${ticketLines}`,
        `Tổng thanh toán: ${this.formatCurrency(payload.totalAmount)}`,
        `Trạng thái thanh toán: ${this.getPaymentStatusLabel(payload.paymentStatus)}`,
        `Thời gian tạo: ${this.formatDate(payload.createdAt)}`,
        '',
        'Đây là email xác nhận sandbox được gửi từ môi trường Mailpit/MailHog local.',
      ].join('\n'),
      html: this.renderConfirmationHtml(payload),
    });

    this.logger.log(
      `Sent sandbox confirmation email for order ${payload.orderCode} to ${payload.recipientEmail}.`,
    );
  }

  private renderConfirmationHtml(payload: PaymentConfirmationEmailPayload) {
    const itemRows = payload.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;">${item.ticketTypeName}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${this.formatCurrency(item.unitPrice)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${this.formatCurrency(item.lineTotal)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
          <h1 style="margin:0 0 16px;font-size:24px;">Ticket Hub xác nhận thanh toán</h1>
          <p style="margin:0 0 12px;">Đêm nhạc: <strong>${payload.concertName}</strong></p>
          <p style="margin:0 0 12px;">Mã đơn hàng: <strong>${payload.orderCode}</strong></p>
          <p style="margin:0 0 12px;">Email người đặt: <strong>${payload.userEmail}</strong></p>
          <p style="margin:0 0 12px;">Người nhận vé: <strong>${payload.recipientName}</strong> &lt;${payload.recipientEmail}&gt;</p>
          <p style="margin:0 0 12px;">Trạng thái thanh toán: <strong>${this.getPaymentStatusLabel(payload.paymentStatus)}</strong></p>
          <p style="margin:0 0 16px;">Thời gian tạo: <strong>${this.formatDate(payload.createdAt)}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Hạng vé</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">Số lượng</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Đơn giá</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="margin:0 0 12px;font-size:18px;">Tổng thanh toán: <strong>${this.formatCurrency(payload.totalAmount)}</strong></p>
          <p style="margin:0;color:#475569;">Đây là email xác nhận sandbox được gửi từ môi trường Mailpit/MailHog local.</p>
        </div>
      </div>
    `;
  }

  private getPaymentStatusLabel(status: string) {
    switch (status) {
      case 'SUCCESS':
        return 'Thanh cong';
      case 'FAILED':
        return 'That bai';
      case 'TIMEOUT':
        return 'Het thoi gian';
      case 'PENDING':
        return 'Dang cho';
      default:
        return status;
    }
  }

  private formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(date);
  }

  private formatCurrency(amount: number) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
