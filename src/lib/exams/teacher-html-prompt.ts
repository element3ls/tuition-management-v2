export const teacherHtmlPromptFileName = "teacher-html-answer-prompt.txt";

export const teacherHtmlAnswerPrompt = `You are preparing worked answers for a tuition exam import.

I will provide a maths question paper, either as text, PDF, or image.

Please follow this workflow:

1. Read the question paper carefully.
- If I send text, solve from the text.
- If I send an image or PDF, read it carefully.
- If any part is unclear, state exactly what is unclear and ask me to resend or clarify it.
- Use the printed question numbers exactly as shown.

2. Write the full worked solution in chat first.

Student-level explanation rule:
- Treat the reader as a student who only scores around 20 marks in Add Maths / Maths.
- Explain in very simple, beginner-friendly language.
- Show every important working step.
- Do not skip algebra steps.
- Do not jump from one line to the answer.
- Explain why each main step is done.
- Use simple words such as "substitute", "expand", "factorise", "move this term", "divide both sides", and "therefore".
- If using a formula, state the formula first before applying it.
- If rearranging an equation, show the rearrangement clearly.
- The solution must be detailed enough for a weak student to follow.

Formatting for the chat solution:
- Use a clean ChatGPT-style maths solution.
- Use proper mathematical notation.
- Use displayed equations where useful.
- Keep the original part labels exactly, such as (a), (b), (c), (a)(i), (a)(ii).
- Use clear steps and a clearly separated final answer.
- Do not summarise, shorten, or skip important working.

Final answer formatting rule:
- For each part or subpart, put the final answer clearly inside brackets.
- Use \\boxed{...} for final answers.
- If the question has (a), (b), and (c), each part must have its own boxed final answer.
- If the question has (a)(i), (a)(ii), and (b), each subpart must have its own boxed final answer.
- Do not leave the final answer hidden inside the working.

3. After writing the chat solution, treat it as the locked master copy.

Important:
- The HTML file must be created from the exact chat solution already shown.
- Do not rewrite the solution.
- Do not paraphrase it.
- Do not solve again.
- Do not change wording, labels, equation order, or final answer format.

4. Create one full upload-ready HTML file from the locked chat solution.

HTML file requirements:
- White background.
- Black text.
- Clean readable sans-serif font.
- ChatGPT-style solution layout.
- Neat spacing.
- Equations must be displayed using MathJax or KaTeX in the standalone HTML file.
- The HTML must contain the same solution text as the chat answer.
- Keep the original part labels exactly.
- Keep each final answer bracketed exactly as shown in the chat solution.
- Include a complete HTML document with <!DOCTYPE html>, <html>, <head>, <body>, CSS, and MathJax or KaTeX setup.
- Do not create PNG files.
- Do not create PDF files.
- Do not create multiple HTML files.

Required output structure:
- Inside the full HTML file, create exactly one <section data-question-number="..."> for each printed question number.
- Use the printed question number exactly as shown on the paper.
- Keep subparts such as (a), (b), (i), and (ii) inside the same section when they belong to the same printed question number.
- If a section contains only one labelled part or subpart, include the full visible label in data-question-number, such as "4(a)" or "9(a)(i)".
- If a section contains multiple parts under the same parent question, use the parent question number in data-question-number, such as "2", and keep each part label inside the section.
- Never use data-question-number="4" for a section whose only answer is labelled 4(a); use data-question-number="4(a)" instead.
- Do not invent, rename, merge, or skip question numbers.
- Put the complete worked answer inside each section.

Worked-solution style:
- Match a clean full-solution worksheet style: plain black text, short explanatory lines, and step-by-step reasoning.
- Start each section with a heading containing the question number, for example <h2>1</h2> or <h2>2(a)</h2>.
- Put each explanation step in its own <p>.
- Put every equation, substitution, simplification, and final expression in its own display-math block.
- End each answer with <p>Final answer:</p> followed by a boxed display-math answer such as <div data-math-display="\\boxed{x = 4}"></div>.
- Keep the HTML readable with indentation and line breaks.

Allowed HTML inside each section:
- Text and headings: <p>, <br>, <h2>, <h3>, <h4>
- Emphasis: <strong>, <em>, <b>, <i>, <u>, <s>, <sup>, <sub>
- Lists: <ul>, <ol>, <li>
- Blocks and code: <blockquote>, <pre>, <code>
- Tables: <table>, <thead>, <tbody>, <tr>, <th>, <td>
- Images only when I provide local image files: <img src="assets/exact-file-name.png" alt="description">

Math rules:
- Use LaTeX for all equations.
- For standalone display with MathJax or KaTeX, include TeX delimiters inside the element text.
- For app import compatibility, also include the same LaTeX in data-math or data-math-display.
- Inline math example: <span data-math="x^2 + 1">\\(x^2 + 1\\)</span>
- Display math example: <div data-math-display="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}">\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]</div>

Safety and import rules:
- The full HTML document may use CSS and MathJax or KaTeX scripts in <head>.
- Do not place <script>, <style>, <a>, <iframe>, <form>, embedded objects, event handler attributes, external image URLs, data URLs, or blob URLs inside any <section data-question-number="...">.
- Do not use links inside the answer sections.
- Do not include the question text unless it is needed to make the worked answer clear.

Final output must include:
1. The full solved answer in chat.
2. One download link for the full HTML file.

Do not include multiple download links.
Do not create separate part/subpart HTML files.

Example section shape inside the full HTML file:
<section data-question-number="1">
  <h2>1</h2>
  <p>First, solve the equation.</p>
  <div data-math-display="2x + 3 = 11">\\[2x + 3 = 11\\]</div>
  <p>Move 3 to the right side.</p>
  <div data-math-display="2x = 8">\\[2x = 8\\]</div>
  <p>Divide both sides by 2.</p>
  <div data-math-display="x = 4">\\[x = 4\\]</div>
  <p>Final answer:</p>
  <div data-math-display="\\boxed{x = 4}">\\[\\boxed{x = 4}\\]</div>
</section>`;
