import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

pdf_filename = "Technical_Stack.pdf"
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    leftMargin=36,
    rightMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

# Custom styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=22,
    leading=26,
    textColor=colors.HexColor('#B32856')
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=11,
    leading=15,
    textColor=colors.HexColor('#5E7A6B')
)

header_cell_style = ParagraphStyle(
    'HeaderCell',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=13,
    textColor=colors.white
)

cell_label_style = ParagraphStyle(
    'CellLabel',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#3B1B26')
)

cell_tech_style = ParagraphStyle(
    'CellTech',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor('#B32856')
)

cell_desc_style = ParagraphStyle(
    'CellDesc',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=11.5,
    textColor=colors.HexColor('#4A4A4A')
)

section_heading_style = ParagraphStyle(
    'SectionHeading',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=colors.HexColor('#B32856')
)

bullet_style = ParagraphStyle(
    'BulletText',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#2C3E50')
)

story = []

# Header
story.append(Paragraph("MONER-JUI • TECHNICAL ARCHITECTURE & STACK", title_style))
story.append(Paragraph("Gentle Dementia & Memory Care Web Application | Project Technical Specification", subtitle_style))
story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#D94676'), spaceBefore=2, spaceAfter=14))

# Table Data
headers = [
    Paragraph("Category", header_cell_style),
    Paragraph("Technology / Libraries", header_cell_style),
    Paragraph("Architecture & Purpose", header_cell_style)
]

table_rows = [
    headers,
    [
        Paragraph("Frontend & UI / UX", cell_label_style),
        Paragraph("HTML5, Modern CSS3, JavaScript (ES6+), Canvas Confetti", cell_tech_style),
        Paragraph("Elder-first responsive design, warm rose/pink calming palette, high-contrast accessible typography, zero countdown pressure.", cell_desc_style)
    ],
    [
        Paragraph("Backend Architecture", cell_label_style),
        Paragraph("Serverless Functions, Vercel Edge Network, RESTful APIs", cell_tech_style),
        Paragraph("Scalable serverless execution, fast edge delivery, automatic HTTPS, zero-maintenance global CDN hosting.", cell_desc_style)
    ],
    [
        Paragraph("Database & Realtime Engine", cell_label_style),
        Paragraph("Supabase (PostgreSQL), Realtime WebSockets, LocalStorage", cell_tech_style),
        Paragraph("Cloud relational database for users, game sessions, and 8 daily tasks with instantaneous live WebSocket updates and offline fallback.", cell_desc_style)
    ],
    [
        Paragraph("Speech & Audio Engine", cell_label_style),
        Paragraph("Web Speech API (SpeechSynthesis), Web Audio API (Synthesizer)", cell_tech_style),
        Paragraph("Gentle female voice assistant (on-demand guidance in English) paired with harmonic solfeggio chimes (528Hz) for cognitive stimulation.", cell_desc_style)
    ],
    [
        Paragraph("Data Analytics & Visualization", cell_label_style),
        Paragraph("Chart.js Data Engine", cell_tech_style),
        Paragraph("Interactive statistical bar graphs (performance across Levels 1-3) and doughnut charts (daily task completion rates) on Host Dashboard.", cell_desc_style)
    ],
    [
        Paragraph("Authentication & Security", cell_label_style),
        Paragraph("Row Level Security (RLS), Role-Based Access Control (RBAC)", cell_tech_style),
        Paragraph("Secured patient login vs administrative host portal with patient profile deletion and log clearing privileges.", cell_desc_style)
    ],
    [
        Paragraph("DevOps & CI / CD", cell_label_style),
        Paragraph("Git, GitHub, Vercel Continuous Deployment", cell_tech_style),
        Paragraph("Automated build, test, and zero-downtime deployment pipeline linked directly to GitHub repository.", cell_desc_style)
    ]
]

col_widths = [120, 160, 260]
t = Table(table_rows, colWidths=col_widths)
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#B32856')),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#F3D9E2')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFFFFF'), colors.HexColor('#FFF8FA')])
]))

story.append(t)
story.append(Spacer(1, 14))

# Key Innovations & Project Highlights
story.append(Paragraph("Key Technical Highlights", section_heading_style))
story.append(Spacer(1, 4))

highlights = [
    "<b>3 Difficulty Levels in Cognitive Games:</b> Memory Match (Visual Pattern Recall) and Remember the Order (Sequential Recall) calibrated across Level 1 (Easy), Level 2 (Medium), and Level 3 (Mastery).",
    "<b>8 Daily Wellness Tasks Tracker:</b> Live-synced checkboxes monitoring hydration, medication, light exercise, and family connection with real-time feedback to the host.",
    "<b>Real-Time Caregiver Dashboard:</b> Central host portal tracking multi-patient activity, live game logs, time spent, accuracy percentages, and aggregated scores.",
    "<b>Safe Storage Management:</b> Host controls to permanently delete inactive patient profiles or flush historical session logs directly from the cloud database."
]

for h in highlights:
    story.append(Paragraph(f"• {h}", bullet_style))
    story.append(Spacer(1, 3))

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#F3D9E2'), spaceBefore=2, spaceAfter=10))

# Prototype Metadata Box (With Password Hidden as xxxxx)
meta_table_data = [
    [
        Paragraph("<b>Live Prototype URL:</b> https://monerjuiprototype.vercel.app", cell_desc_style),
        Paragraph("<b>Host Username:</b> Abhishek Kawarkhe", cell_desc_style)
    ],
    [
        Paragraph("<b>GitHub Repository:</b> https://github.com/jaysteam04072003-cell/Moner-Jui", cell_desc_style),
        Paragraph("<b>Host Password:</b> xxxxx", cell_desc_style)
    ]
]

meta_table = Table(meta_table_data, colWidths=[320, 220])
meta_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFF0F4')),
    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#F8D3DF')),
    ('PADDING', (0, 0), (-1, -1), 6),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
]))

story.append(meta_table)

doc.build(story)
print("PDF generated successfully: Technical_Stack.pdf")
