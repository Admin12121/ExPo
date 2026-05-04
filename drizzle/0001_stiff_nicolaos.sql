CREATE TABLE "assessment_close_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"requested_by_id" uuid,
	"requested_by_role" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"responded_by_id" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_close_requests_status_check" CHECK ("assessment_close_requests"."status" in ('pending', 'accepted', 'rejected')),
	CONSTRAINT "assessment_close_requests_role_check" CHECK ("assessment_close_requests"."requested_by_role" in ('admin', 'writer', 'user'))
);
--> statement-breakpoint
CREATE TABLE "assessment_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"uploader_id" uuid,
	"kind" text NOT NULL,
	"original_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"scan_status" text DEFAULT 'clean' NOT NULL,
	"scan_message" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_files_kind_check" CHECK ("assessment_files"."kind" in ('source', 'completed', 'payment_proof')),
	CONSTRAINT "assessment_files_scan_status_check" CHECK ("assessment_files"."scan_status" in ('clean', 'rejected', 'deleted')),
	CONSTRAINT "assessment_files_size_check" CHECK ("assessment_files"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assessment_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" uuid,
	"sender_role" text NOT NULL,
	"display_name" text NOT NULL,
	"text" text NOT NULL,
	"reply_to_message_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "assessment_messages_sender_role_check" CHECK ("assessment_messages"."sender_role" in ('admin', 'writer', 'user'))
);
--> statement-breakpoint
CREATE TABLE "assessment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"reporter_id" uuid,
	"target_user_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_reports_status_check" CHECK ("assessment_reports"."status" in ('open', 'resolved'))
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"writer_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"topic" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"deadline_at" timestamp with time zone,
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"payment_submitted_at" timestamp with time zone,
	"payment_verified_at" timestamp with time zone,
	"first_downloaded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_status_check" CHECK ("assessments"."status" in ('open', 'in_progress', 'close_requested', 'closed', 'completed_pending_payment', 'payment_submitted', 'payment_verified', 'downloaded', 'archived', 'cancelled')),
	CONSTRAINT "assessments_price_check" CHECK ("assessments"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"details" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"role" text,
	"assessment_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notifications_status_check" CHECK ("notifications"."status" in ('unread', 'read'))
);
--> statement-breakpoint
ALTER TABLE "assessment_close_requests" ADD CONSTRAINT "assessment_close_requests_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_close_requests" ADD CONSTRAINT "assessment_close_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_close_requests" ADD CONSTRAINT "assessment_close_requests_responded_by_id_users_id_fk" FOREIGN KEY ("responded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_files" ADD CONSTRAINT "assessment_files_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_files" ADD CONSTRAINT "assessment_files_uploader_id_users_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_messages" ADD CONSTRAINT "assessment_messages_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_messages" ADD CONSTRAINT "assessment_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_resolved_by_id_users_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_writer_id_users_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "assessment_close_requests_assessment_idx" ON "assessment_close_requests" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_close_requests_status_idx" ON "assessment_close_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_files_storage_key_unique" ON "assessment_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "assessment_files_assessment_idx" ON "assessment_files" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_files_kind_idx" ON "assessment_files" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "assessment_files_scan_idx" ON "assessment_files" USING btree ("scan_status");--> statement-breakpoint
CREATE INDEX "assessment_messages_assessment_idx" ON "assessment_messages" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_messages_room_idx" ON "assessment_messages" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "assessment_messages_created_idx" ON "assessment_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assessment_reports_assessment_idx" ON "assessment_reports" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "assessment_reports_status_idx" ON "assessment_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessments_user_idx" ON "assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessments_writer_idx" ON "assessments" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX "assessments_status_idx" ON "assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessments_deadline_idx" ON "assessments" USING btree ("deadline_at");--> statement-breakpoint
CREATE INDEX "assessments_created_idx" ON "assessments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assessments_completed_idx" ON "assessments" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "assessments_downloaded_idx" ON "assessments" USING btree ("first_downloaded_at");--> statement-breakpoint
CREATE INDEX "assessments_payment_state_idx" ON "assessments" USING btree ("status","payment_submitted_at","payment_verified_at");--> statement-breakpoint
CREATE INDEX "maintenance_runs_job_idx" ON "maintenance_runs" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "maintenance_runs_started_idx" ON "maintenance_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_role_idx" ON "notifications" USING btree ("role");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");