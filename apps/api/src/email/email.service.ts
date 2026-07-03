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
    const subject = `[Ticket Hub] Xac nhan thanh toan sandbox ${payload.orderCode}`;
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
        'Xac nhan thanh toan sandbox Ticket Hub',
        '',
        `Dem nhac: ${payload.concertName}`,
        `Ma don hang: ${payload.orderCode}`,
        `Email nguoi dat: ${payload.userEmail}`,
        `Nguoi nhan ve: ${payload.recipientName} <${payload.recipientEmail}>`,
        `Chi tiet ve:\n${ticketLines}`,
        `Tong thanh toan: ${this.formatCurrency(payload.totalAmount)}`,
        `Trang thai thanh toan: ${this.getPaymentStatusLabel(payload.paymentStatus)}`,
        `Thoi gian tao: ${this.formatDate(payload.createdAt)}`,
        '',
        'Day la email xac nhan sandbox duoc gui tu moi truong Mailpit/MailHog local.',
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
          <h1 style="margin:0 0 16px;font-size:24px;">Ticket Hub xac nhan thanh toan sandbox</h1>
          <p style="margin:0 0 12px;">Dem nhac: <strong>${payload.concertName}</strong></p>
          <p style="margin:0 0 12px;">Ma don hang: <strong>${payload.orderCode}</strong></p>
          <p style="margin:0 0 12px;">Email nguoi dat: <strong>${payload.userEmail}</strong></p>
          <p style="margin:0 0 12px;">Nguoi nhan ve: <strong>${payload.recipientName}</strong> &lt;${payload.recipientEmail}&gt;</p>
          <p style="margin:0 0 12px;">Trang thai thanh toan: <strong>${this.getPaymentStatusLabel(payload.paymentStatus)}</strong></p>
          <p style="margin:0 0 16px;">Thoi gian tao: <strong>${this.formatDate(payload.createdAt)}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Hang ve</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:center;">So luong</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Don gia</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Thanh tien</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="margin:0 0 12px;font-size:18px;">Tong thanh toan: <strong>${this.formatCurrency(payload.totalAmount)}</strong></p>
          <p style="margin:0;color:#475569;">Day la email xac nhan sandbox duoc gui tu moi truong Mailpit/MailHog local.</p>
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
