<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SalesReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public $summary;
    public $sales;

    public function __construct(array $summary, $sales)
    {
        $this->summary = $summary;
        $this->sales = $sales;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Sales Report — {$this->summary['label']}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.sales-report',
        );
    }
}
