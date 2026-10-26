import os
from datetime import datetime
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from app.core.config import settings

class CertificateGenerator:
    """
    Builds high-resolution, vector PDF certificates using ReportLab.
    Includes corporate branding, decorative security borders, recipient details,
    issue date, unique certificate identifier, and validation QR/URL block.
    """

    @staticmethod
    def generate_pdf(
        certificate_id: str,
        intern_name: str,
        internship_role: str,
        start_date: datetime,
        end_date: datetime,
        completion_date: datetime,
        verification_url: str,
        project_summary: str = "Successful delivery of enterprise-grade software tasks with outstanding review evaluations."
    ) -> str:
        filename = f"{certificate_id}.pdf"
        filepath = os.path.join(settings.CERTIFICATE_DIR, filename)

        # Landscape Letter: 11 x 8.5 inches (792 x 612 pt)
        page_width, page_height = landscape(letter)
        c = canvas.Canvas(filepath, pagesize=landscape(letter))

        # Background color
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

        # Outer decorative frame
        c.setStrokeColor(colors.HexColor("#312e81"))  # Indigo 900
        c.setLineWidth(4)
        c.rect(24, 24, page_width - 48, page_height - 48)

        # Inner thin gold/accent frame
        c.setStrokeColor(colors.HexColor("#d97706"))  # Amber 600
        c.setLineWidth(1.5)
        c.rect(32, 32, page_width - 64, page_height - 64)

        # Corporate Header
        c.setFillColor(colors.HexColor("#4338ca"))  # Indigo 700
        c.setFont("Helvetica-Bold", 14)
        c.drawCentredString(page_width / 2.0, page_height - 75, "GLOBAL TECHNOLOGY & INNOVATION ACADEMY")

        # Certificate Title
        c.setFillColor(colors.HexColor("#1e1b4b"))  # Indigo 950
        c.setFont("Helvetica-Bold", 32)
        c.drawCentredString(page_width / 2.0, page_height - 120, "CERTIFICATE OF COMPLETION")

        # Sub-header
        c.setFillColor(colors.HexColor("#4b5563"))  # Gray 600
        c.setFont("Helvetica-Oblique", 13)
        c.drawCentredString(page_width / 2.0, page_height - 150, "This is proudly awarded to acknowledge that")

        # Intern Name
        c.setFillColor(colors.HexColor("#1e3a8a"))  # Blue 900
        c.setFont("Helvetica-Bold", 28)
        c.drawCentredString(page_width / 2.0, page_height - 195, intern_name.upper())

        # Underline under name
        c.setStrokeColor(colors.HexColor("#3b82f6"))  # Blue 500
        c.setLineWidth(1)
        name_width = c.stringWidth(intern_name.upper(), "Helvetica-Bold", 28)
        c.line((page_width - name_width) / 2.0 - 20, page_height - 203, (page_width + name_width) / 2.0 + 20, page_height - 203)

        # Body text
        c.setFillColor(colors.HexColor("#374151"))  # Gray 700
        c.setFont("Helvetica", 14)
        c.drawCentredString(page_width / 2.0, page_height - 235, "has diligently satisfied all curriculum requirements and successfully completed the internship as")

        # Role
        c.setFillColor(colors.HexColor("#4f46e5"))  # Indigo 600
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(page_width / 2.0, page_height - 265, internship_role)

        # Dates & Summary
        start_str = start_date.strftime("%B %d, %Y") if start_date else "Program Commencement"
        end_str = end_date.strftime("%B %d, %Y") if end_date else completion_date.strftime("%B %d, %Y")
        c.setFillColor(colors.HexColor("#4b5563"))
        c.setFont("Helvetica", 11)
        c.drawCentredString(page_width / 2.0, page_height - 295, f"Tenure: {start_str}  —  {end_str}")

        if project_summary:
            c.setFont("Helvetica-Oblique", 10)
            c.setFillColor(colors.HexColor("#6b7280"))
            c.drawCentredString(page_width / 2.0, page_height - 320, f'Project Portfolio: "{project_summary}"')

        # Signatures
        sig_y = 110
        # Left Signatory
        c.setStrokeColor(colors.HexColor("#9ca3af"))
        c.setLineWidth(1)
        c.line(100, sig_y + 30, 260, sig_y + 30)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#1f2937"))
        c.drawString(100, sig_y + 16, "Dr. Elena Vance")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#6b7280"))
        c.drawString(100, sig_y + 4, "Director of Technical Mentorship")

        # Center Gold Seal Emblem
        center_x = page_width / 2.0
        c.setFillColor(colors.HexColor("#fef3c7"))
        c.circle(center_x, sig_y + 20, 36, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#d97706"))
        c.setLineWidth(2)
        c.circle(center_x, sig_y + 20, 36, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#b45309"))
        c.drawCentredString(center_x, sig_y + 24, "VERIFIED")
        c.drawCentredString(center_x, sig_y + 12, "ACCREDITED")

        # Right Signatory
        c.line(page_width - 260, sig_y + 30, page_width - 100, sig_y + 30)
        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#1f2937"))
        c.drawString(page_width - 260, sig_y + 16, "Marcus Sterling")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#6b7280"))
        c.drawString(page_width - 260, sig_y + 4, "VP of Engineering & Talent")

        # Bottom Verification Bar
        c.setFillColor(colors.HexColor("#e2e8f0"))
        c.rect(32, 32, page_width - 64, 28, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(colors.HexColor("#334155"))
        c.drawString(45, 42, f"Certificate ID: {certificate_id}")
        c.setFont("Helvetica", 9)
        c.drawRightString(page_width - 45, 42, f"Verify authenticity at: {verification_url}")

        c.save()
        return filepath

certificate_generator = CertificateGenerator()
