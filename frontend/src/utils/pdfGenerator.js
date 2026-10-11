import { jsPDF } from 'jspdf';

export const generateReportCard = (student, marks = [], gtuResults = [], remarks = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [79, 70, 229]; // Indigo
  const textColor = [30, 41, 59]; // Slate 800
  const lightGrey = [241, 245, 249]; // Slate 100

  // 1. Draw Border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287);
  doc.rect(7, 7, 196, 283);

  // 2. Letterhead Header
  doc.setFillColor(...primaryColor);
  doc.rect(7, 7, 196, 5, 'F');

  // Institute Name
  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(19);
  doc.text('GOVERNMENT POLYTECHNIC GANDHINAGAR', 103, 20, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Affiliated to Gujarat Technological University (GTU) | Directorate of Technical Education, Gujarat', 103, 26, { align: 'center' });
  doc.text('Department of Academic Studies & Controller of Examinations', 103, 31, { align: 'center' });

  // Decorative divider
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...primaryColor);
  doc.text('OFFICIAL COMBINED ACADEMIC TRANSCRIPT', 103, 42, { align: 'center' });

  // 3. Student Bio Information
  doc.setFillColor(...lightGrey);
  doc.rect(15, 47, 180, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, 47, 180, 24);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...textColor);
  doc.text('Student Name:', 20, 54);
  doc.text('Roll / Enroll No:', 20, 60);
  doc.text('Class / Branch:', 20, 66);

  doc.text('Date of Issue:', 115, 54);
  doc.text('Academic Term:', 115, 60);
  doc.text('Overall Result:', 115, 66);

  // Values
  doc.setFont('Helvetica', 'normal');
  doc.text(student.name || 'N/A', 50, 54);
  doc.text(student.loginId || 'N/A', 50, 60);
  doc.text(student.classOrSubject || 'Computer Engineering', 50, 66);

  const issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(issueDate, 145, 54);
  doc.text('2026 - 2027', 145, 60);

  // Calculate GTU Grade Points & SPI / CGPA
  const gradePointMap = {
    'AA': 10,
    'AB': 9,
    'BB': 8,
    'BC': 7,
    'CC': 6,
    'CD': 5,
    'DD': 4,
    'FF': 0
  };

  let totalPoints = 0;
  let totalSubjects = 0;

  // Internal test stats
  let intPass = true;
  marks.forEach(m => {
    const pct = m.maxMarks > 0 ? (m.marksObtained / m.maxMarks) * 100 : 0;
    if (pct < 40) intPass = false;
    let pt = 0;
    if (pct >= 85) pt = 10;
    else if (pct >= 75) pt = 9;
    else if (pct >= 65) pt = 8;
    else if (pct >= 55) pt = 7;
    else if (pct >= 45) pt = 6;
    else if (pct >= 40) pt = 5;
    else pt = 0;
    totalPoints += pt;
    totalSubjects++;
  });

  // GTU exam stats
  let gtuPass = true;
  gtuResults.forEach(g => {
    const gr = (g.gtuGrade || '').toUpperCase().trim();
    if (gr === 'FF' || g.resultStatus === 'FAIL') gtuPass = false;
    const pt = gradePointMap[gr] !== undefined ? gradePointMap[gr] : (g.resultStatus === 'PASS' ? 7 : 0);
    totalPoints += pt;
    totalSubjects++;
  });

  const spi = totalSubjects > 0 ? (totalPoints / totalSubjects) : 0;
  const spiDisplay = spi.toFixed(2);
  const cgpaDisplay = spiDisplay;

  const isPassed = intPass && gtuPass && (marks.length > 0 || gtuResults.length > 0);

  doc.setFont('Helvetica', 'bold');
  if (isPassed) {
    doc.setTextColor(16, 185, 129); // Green
    doc.text('PASSED', 145, 66);
  } else {
    doc.setTextColor(244, 63, 94); // Red
    doc.text('FAIL / ARREARS', 145, 66);
  }

  let currentY = 77;

  // 4. Internal Assessment Table
  if (marks.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('INTERNAL CONTINUOUS EVALUATION', 15, currentY);
    currentY += 4;

    doc.setFillColor(...primaryColor);
    doc.rect(15, currentY, 180, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text('Subject', 20, currentY + 5.5);
    doc.text('Semester', 75, currentY + 5.5);
    doc.text('Exam Type', 105, currentY + 5.5);
    doc.text('Marks', 145, currentY + 5.5);
    doc.text('Max', 165, currentY + 5.5);
    doc.text('Status', 182, currentY + 5.5);

    currentY += 8;

    marks.forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 7, 'F');
      }
      doc.setTextColor(...textColor);
      doc.setFont('Helvetica', 'normal');
      doc.text(m.subject, 20, currentY + 5);
      doc.text(m.semester || 'Sem 1', 75, currentY + 5);
      doc.text(m.examType || 'Internal', 105, currentY + 5);
      doc.text(m.marksObtained.toString(), 145, currentY + 5);
      doc.text(m.maxMarks.toString(), 165, currentY + 5);

      const pass = (m.marksObtained / m.maxMarks) * 100 >= 40;
      doc.setFont('Helvetica', 'bold');
      if (pass) { doc.setTextColor(16, 185, 129); doc.text('Pass', 182, currentY + 5); }
      else { doc.setTextColor(244, 63, 94); doc.text('Fail', 182, currentY + 5); }

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + 7, 195, currentY + 7);
      currentY += 7;
    });

    currentY += 4;
  }

  // 5. GTU Examination Results Table (Grade Only - No Marks)
  if (gtuResults.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text('GTU EXTERNAL EXAMINATION RESULTS', 15, currentY);
    currentY += 4;

    doc.setFillColor(30, 41, 59); // Slate 800 header for GTU
    doc.rect(15, currentY, 180, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.text('Subject Code & Name', 20, currentY + 5.5);
    doc.text('Semester', 105, currentY + 5.5);
    doc.text('Grade', 145, currentY + 5.5);
    doc.text('Result Status', 175, currentY + 5.5);

    currentY += 8;

    gtuResults.forEach((g, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, currentY, 180, 7, 'F');
      }
      doc.setTextColor(...textColor);
      doc.setFont('Helvetica', 'normal');
      const subjText = `${g.subjectCode || ''} ${g.subjectName}`.trim();
      doc.text(subjText.length > 42 ? subjText.substring(0, 42) + '...' : subjText, 20, currentY + 5);
      doc.text(g.semester || 'Sem 1', 105, currentY + 5);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(g.gtuGrade || 'AA', 145, currentY + 5);

      const pass = g.resultStatus === 'PASS' && g.gtuGrade !== 'FF';
      if (pass) { doc.setTextColor(16, 185, 129); doc.text('PASS', 175, currentY + 5); }
      else { doc.setTextColor(244, 63, 94); doc.text('FAIL', 175, currentY + 5); }

      doc.setDrawColor(241, 245, 249);
      doc.line(15, currentY + 7, 195, currentY + 7);
      currentY += 7;
    });

    currentY += 4;
  }

  // 6. Overall Performance Index Box (SPI & CGPA Only - No Marks / Percentage)
  doc.setFillColor(241, 245, 249);
  doc.rect(15, currentY, 180, 12, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, currentY, 180, 12);

  doc.setTextColor(30, 41, 59);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Semester Performance Index (SPI):  ${spiDisplay}`, 30, currentY + 7.5);
  doc.text(`Cumulative Grade Point Average (CGPA):  ${cgpaDisplay}`, 110, currentY + 7.5);

  currentY += 18;

  // 7. Faculty Remarks Section
  if (remarks.length > 0) {
    doc.setTextColor(...primaryColor);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FACULTY ACADEMIC OBSERVATIONS', 15, currentY);
    
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.3);
    doc.line(15, currentY + 2, 75, currentY + 2);
    currentY += 6;

    doc.setTextColor(...textColor);
    doc.setFontSize(8.5);
    
    remarks.slice(0, 2).forEach((rem) => {
      doc.setFont('Helvetica', 'bold');
      doc.text(`${rem.teacherName}:`, 15, currentY);
      doc.setFont('Helvetica', 'italic');
      doc.setTextColor(71, 85, 105);
      
      const splitComment = doc.splitTextToSize(rem.comment, 130);
      doc.text(splitComment, 50, currentY);
      
      currentY += (splitComment.length * 4) + 2;
    });
  }

  // 8. Signatures at Footer
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 32;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Line for Faculty
  doc.line(25, footerY, 75, footerY);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Assigned Faculty Advisor', 50, footerY + 4, { align: 'center' });

  // Line for Controller of Examinations / Principal
  doc.line(125, footerY, 175, footerY);
  doc.text('Controller of GTU Examinations', 150, footerY + 4, { align: 'center' });
  doc.text('(Official University Seal)', 150, footerY + 8, { align: 'center' });

  // Save the PDF
  doc.save(`GPG_Transcript_${(student.name || 'Student').replace(/\s+/g, '_')}_${student.loginId}.pdf`);
};
