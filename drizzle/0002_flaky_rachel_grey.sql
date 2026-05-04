CREATE TABLE "otp_resend_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_resend_logs_email_idx" ON "otp_resend_logs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "otp_resend_logs_ip_idx" ON "otp_resend_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "otp_resend_logs_created_idx" ON "otp_resend_logs" USING btree ("created_at");