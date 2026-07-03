/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

describe('EmailService', () => {
  let sendMail: jest.Mock;
  let service: EmailService;

  beforeEach(() => {
    sendMail = jest.fn().mockResolvedValue(undefined);
    jest.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail,
    } as never);

    service = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends a sandbox confirmation email with ticket and order details', async () => {
    await service.sendPaymentConfirmationEmail({
      concertName: 'Dem Nhac Sac Mau Thanh Pho',
      orderCode: 'ORD-000001',
      userEmail: 'user@tickethub.local',
      recipientEmail: 'user@tickethub.local',
      recipientName: 'Demo User',
      paymentStatus: 'SUCCESS',
      totalAmount: 4_000_000,
      createdAt: '2026-07-03T10:00:00.000Z',
      items: [
        {
          ticketTypeName: 'VIP',
          quantity: 2,
          unitPrice: 2_000_000,
          lineTotal: 4_000_000,
        },
      ],
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@tickethub.local',
        subject: expect.stringContaining('Ticket Hub'),
        text: expect.stringContaining('Xac nhan thanh toan sandbox Ticket Hub'),
        html: expect.stringContaining('Ma don hang'),
        from: 'no-reply@tickethub.local',
      }),
    );
  });
});
