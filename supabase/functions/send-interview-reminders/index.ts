import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting interview reminder check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get interviews starting in the next 1 hour that haven't been notified
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    console.log(`Checking for interviews between ${now.toISOString()} and ${oneHourFromNow.toISOString()}`);

    const { data: interviews, error: fetchError } = await supabase
      .from("interviews")
      .select("*, team_members:interviewee_id(name, email)")
      .eq("reminder_sent", false)
      .eq("status", "scheduled")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", oneHourFromNow.toISOString());

    if (fetchError) {
      console.error("Error fetching interviews:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${interviews?.length || 0} interviews needing reminders`);

    if (!interviews || interviews.length === 0) {
      return new Response(
        JSON.stringify({ message: "No interviews needing reminders" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];

    for (const interview of interviews) {
      const interviewTime = new Date(interview.scheduled_at);
      const formattedTime = interviewTime.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const intervieweeName = interview.team_members?.name || "Team Member";
      const subject = `Interview Reminder: ${interview.title}`;
      const emailBody = `
        <h2>Interview Reminder</h2>
        <p>You have an upcoming interview:</p>
        <ul>
          <li><strong>Title:</strong> ${interview.title}</li>
          <li><strong>Interviewee:</strong> ${intervieweeName}</li>
          <li><strong>Interviewer:</strong> ${interview.interviewer_name || "TBD"}</li>
          <li><strong>Scheduled Time:</strong> ${formattedTime} (PST)</li>
          <li><strong>Duration:</strong> ${interview.duration_minutes || 60} minutes</li>
        </ul>
        ${interview.notes ? `<p><strong>Notes:</strong> ${interview.notes}</p>` : ""}
      `;

      const smsBody = `Interview Reminder: "${interview.title}" with ${intervieweeName} at ${formattedTime} (PST)`;

      let emailSent = false;
      let smsSent = false;

      // Send Email via Resend
      if (resendApiKey) {
        try {
          const resend = new Resend(resendApiKey);
          const emailResponse = await resend.emails.send({
            from: "Interview Reminders <onboarding@resend.dev>",
            to: ["vijayputta45@gmail.com"],
            subject: subject,
            html: emailBody,
          });
          console.log(`Email sent for interview ${interview.id}:`, emailResponse);
          emailSent = true;
        } catch (emailError) {
          console.error(`Failed to send email for interview ${interview.id}:`, emailError);
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping email");
      }

      // Send SMS via Twilio
      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const smsResponse = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
            },
            body: new URLSearchParams({
              To: "+19454449714",
              From: twilioPhoneNumber,
              Body: smsBody,
            }),
          });

          if (smsResponse.ok) {
            console.log(`SMS sent for interview ${interview.id}`);
            smsSent = true;
          } else {
            const smsError = await smsResponse.text();
            console.error(`Failed to send SMS for interview ${interview.id}:`, smsError);
          }
        } catch (smsError) {
          console.error(`SMS error for interview ${interview.id}:`, smsError);
        }
      } else {
        console.warn("Twilio credentials not configured, skipping SMS");
      }

      // Update reminder_sent flag
      if (emailSent || smsSent) {
        const { error: updateError } = await supabase
          .from("interviews")
          .update({ reminder_sent: true })
          .eq("id", interview.id);

        if (updateError) {
          console.error(`Failed to update reminder_sent for interview ${interview.id}:`, updateError);
        } else {
          console.log(`Marked interview ${interview.id} as reminder_sent`);
        }
      }

      results.push({
        interviewId: interview.id,
        title: interview.title,
        emailSent,
        smsSent,
      });
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${interviews.length} interview reminders`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error in send-interview-reminders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
