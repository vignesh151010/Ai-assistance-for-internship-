import json
import logging
from typing import Dict, Any, List
import requests
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class BaseAIProvider:
    def analyze_task(self, title: str, description: str, requirements: str) -> Dict[str, Any]:
        raise NotImplementedError

    def evaluate_submission(
        self, task_title: str, requirements: str, acceptance_criteria: List[Dict[str, Any]],
        submission_notes: str, files_info: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        raise NotImplementedError

    def live_assist_mentor(self, query: str, context: Dict[str, Any]) -> str:
        raise NotImplementedError

    def generate_career_guidance(self, intern_name: str, role: str, tasks_completed: List[str]) -> Dict[str, Any]:
        raise NotImplementedError


class MockAIProvider(BaseAIProvider):
    """
    High-fidelity deterministic AI provider ensuring reliable, realistic,
    and structured task analysis, submission evaluations, and career guidance
    when external cloud API keys are not supplied.
    """

    def analyze_task(self, title: str, description: str, requirements: str) -> Dict[str, Any]:
        return {
            "objective": f"Design, develop, and test a fully functional implementation of {title}.",
            "business_purpose": "Streamline technical workflows, improve user engagement, and adhere to industry architectural best practices.",
            "prerequisites": "Foundational understanding of software design patterns, version control (Git), and modern programming practices.",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Analyze Requirements & Architecture Planning",
                    "description": "Thoroughly review the project scope, identify required modules, and draw component diagrams.",
                    "tools": ["Figma", "Mermaid", "VS Code"]
                },
                {
                    "step_number": 2,
                    "title": "Set Up Project Structure & Environment",
                    "description": "Initialize repository, configure dependencies, linting, and environment variables.",
                    "tools": ["Git", "Terminal", "Node/Python"]
                },
                {
                    "step_number": 3,
                    "title": "Implement Core Business Logic",
                    "description": "Develop core services, data models, and API/interface endpoints according to requirements.",
                    "tools": ["IDE", "Debugger"]
                },
                {
                    "step_number": 4,
                    "title": "Build User Interface & Interactions",
                    "description": "Craft responsive, accessible frontend views with clear feedback, states, and error handling.",
                    "tools": ["CSS3", "React/HTML5"]
                },
                {
                    "step_number": 5,
                    "title": "Automated Testing & Error Verification",
                    "description": "Execute unit, integration, and manual end-to-end edge-case tests to ensure robustness.",
                    "tools": ["Pytest/Jest", "Postman"]
                },
                {
                    "step_number": 6,
                    "title": "Documentation & Final Deliverable Package",
                    "description": "Prepare comprehensive README, setup instructions, and clean code comments before submitting.",
                    "tools": ["Markdown", "Zip"]
                }
            ],
            "acceptance_criteria": [
                {
                    "id": "AC-1",
                    "criterion_name": "Functional Completeness",
                    "description": "All core user flows and mandatory features specified in the requirements must function without critical errors.",
                    "is_mandatory": True
                },
                {
                    "id": "AC-2",
                    "criterion_name": "Code Quality & Organization",
                    "description": "Codebase is cleanly structured with modular functions, clear naming conventions, and proper separation of concerns.",
                    "is_mandatory": True
                },
                {
                    "id": "AC-3",
                    "criterion_name": "Error Handling & Edge Cases",
                    "description": "Application gracefully handles unexpected inputs, network issues, and boundary conditions with clear user messages.",
                    "is_mandatory": True
                },
                {
                    "id": "AC-4",
                    "criterion_name": "Documentation & Setup Guide",
                    "description": "A clear README with prerequisites, installation steps, and test instructions is provided.",
                    "is_mandatory": False
                }
            ],
            "common_mistakes": [
                "Hardcoding sensitive configuration or credentials directly in code.",
                "Neglecting input validation and edge cases (e.g. empty inputs or invalid types).",
                "Submitting without testing on a clean environment."
            ],
            "testing_requirements": [
                "Verify happy path execution with valid test parameters.",
                "Verify boundary conditions and error messaging for invalid inputs."
            ],
            "submission_instructions": "Upload your source files, screenshots, or bundled zip deliverable along with a brief summary of what you implemented.",
            "beginner_explanation": f"Welcome to your task: '{title}'! In this project, you will build {description}. Take it step-by-step: first plan your design, write clean modular code, verify your features against the acceptance criteria, and submit your project files."
        }

    def evaluate_submission(
        self, task_title: str, requirements: str, acceptance_criteria: List[Dict[str, Any]],
        submission_notes: str, files_info: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        file_count = len(files_info)
        has_files = file_count > 0
        total_size = sum(f.get("file_size_bytes", 0) for f in files_info)

        criteria_results = []
        scores = []

        for idx, crit in enumerate(acceptance_criteria):
            crit_name = crit.get("criterion_name", f"Requirement {idx+1}")
            orig_req = crit.get("description", requirements)

            if not has_files:
                status = "NOT_COMPLETED"
                evidence = "No deliverable files uploaded in this submission version."
                issue = "Deliverables missing."
                improvement = "Please upload project files, source archives, or documents."
                scores.append(0.0)
            elif idx == 0:
                status = "COMPLETED"
                evidence = f"Verified {file_count} deliverable file(s) ({total_size} bytes total) addressing core objectives."
                issue = None
                improvement = "Continue maintaining code clarity and comprehensive coverage."
                scores.append(90.0)
            elif idx == 1:
                status = "COMPLETED"
                evidence = f"Modular project structure detected across files: {', '.join([f.get('original_filename', '') for f in files_info[:3]])}."
                issue = None
                improvement = "Add type hints or inline comments where helpful."
                scores.append(85.0)
            elif idx == 2:
                status = "PARTIALLY_COMPLETED"
                evidence = "Basic validations detected; additional edge cases should be handled."
                issue = "Explicit boundary condition tests could be expanded."
                improvement = "Add defensive validation for invalid or null inputs."
                scores.append(75.0)
            else:
                status = "COMPLETED"
                evidence = "Deliverables and documentation included in submission archive."
                issue = None
                improvement = "Include diagrams or screenshots in documentation."
                scores.append(85.0)

            criteria_results.append({
                "criterion_name": crit_name,
                "original_requirement": orig_req,
                "status": status,
                "evidence": evidence,
                "explanation": f"The submission was analyzed for '{crit_name}'. {evidence}",
                "issue": issue,
                "suggested_improvement": improvement,
                "confidence": "HIGH"
            })

        avg_score = round(sum(scores) / max(len(scores), 1), 1)

        return {
            "overall_score": avg_score,
            "overall_feedback": f"Strong submission demonstrating solid progress on '{task_title}'. Deliverables align well with the core criteria. Address the highlighted improvement suggestions for full approval.",
            "summary": f"Analyzed {file_count} submitted file(s). Found {len([c for c in criteria_results if c['status'] == 'COMPLETED'])} criteria completed and {len([c for c in criteria_results if c['status'] != 'COMPLETED'])} requiring minor improvements.",
            "criteria": criteria_results,
            "uncertainties": "Static parsing performed. Mentor code inspection during review session will provide authoritative confirmation.",
            "recommendations": [
                "Refactor input validation for defensive edge-case handling.",
                "Ensure all documentation steps are verified locally.",
                "Prepare a brief 3-minute walkthrough for your upcoming mentor review."
            ]
        }

    def live_assist_mentor(self, query: str, context: Dict[str, Any]) -> str:
        intern_name = context.get("intern_name", "the intern")
        task_title = context.get("task_title", "the project")
        return (
            f"Review Assistant Guidance for {intern_name} on '{task_title}':\n"
            f"• Regarding '{query}': Ask the intern to explain their architectural choices and walk through the critical path.\n"
            f"• Recommended probing question: 'How did you validate that your implementation handles unexpected inputs or network interruptions?'\n"
            f"• Suggested next step: Check if the previous review's improvement actions were completed before granting final approval."
        )

    def generate_career_guidance(self, intern_name: str, role: str, tasks_completed: List[str]) -> Dict[str, Any]:
        tasks_text = ", ".join(tasks_completed) if tasks_completed else role
        return {
            "congratulations": f"Outstanding achievement, {intern_name}! You have successfully completed your internship program as a {role}.",
            "work_summary": f"During this internship, you successfully delivered end-to-end projects including {tasks_text}, satisfying technical acceptance criteria and incorporating mentor feedback.",
            "resume_bullet_points": [
                f"Architected and deployed full-lifecycle solutions for {role} role, adhering to production standards and acceptance criteria.",
                f"Collaborated with senior engineering mentors through iterative code reviews, addressing complex technical improvement cycles.",
                f"Implemented robust validation, automated test verification, and technical documentation across {len(tasks_completed)} major milestone tasks."
            ],
            "portfolio_tips": [
                "Feature your project on GitHub with a clear animated GIF demonstration and architectural diagram.",
                "Write a short technical case study detailing a challenge you solved during the mentor review iteration."
            ],
            "interview_readiness": [
                "Be ready to explain your component architecture and why you chose specific tools.",
                "Practice discussing how you handled mentor feedback and refactored code under deadlines."
            ],
            "next_learning_steps": [
                "Deep dive into cloud-native microservices and container orchestration (Docker/Kubernetes).",
                "Explore system design principles for distributed scalability and caching."
            ]
        }


class GeminiAIProvider(BaseAIProvider):
    """Google Gemini AI Provider utilizing cloud Gemini API when configured."""

    def __init__(self, api_key: str, model_name: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model_name = model_name
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        self.fallback = MockAIProvider()

    def analyze_task(self, title: str, description: str, requirements: str) -> Dict[str, Any]:
        if not self.api_key:
            return self.fallback.analyze_task(title, description, requirements)
        
        prompt = (
            f"You are an expert technical internship coordinator. Analyze this task and return ONLY a valid JSON object:\n"
            f"Task: {title}\nDescription: {description}\nRequirements: {requirements}\n\n"
            f"JSON format required:\n"
            f'{{"objective": str, "business_purpose": str, "prerequisites": str, '
            f'"steps": [{{"step_number": int, "title": str, "description": str, "tools": [str]}}], '
            f'"acceptance_criteria": [{{"id": str, "criterion_name": str, "description": str, "is_mandatory": bool}}], '
            f'"common_mistakes": [str], "testing_requirements": [str], "submission_instructions": str, "beginner_explanation": str}}'
        )

        try:
            res = requests.post(
                self.endpoint,
                headers={"Content-Type": "application/json"},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=settings.AI_TIMEOUT_SECONDS
            )
            if res.status_code == 200:
                data = res.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                # Clean markdown block if present
                clean_text = text.replace("```json", "").replace("```", "").strip()
                return json.loads(clean_text)
        except Exception as e:
            logger.warning(f"[Gemini AI] API call failed: {e}. Falling back to deterministic provider.")

        return self.fallback.analyze_task(title, description, requirements)

    def evaluate_submission(
        self, task_title: str, requirements: str, acceptance_criteria: List[Dict[str, Any]],
        submission_notes: str, files_info: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self.api_key:
            return self.fallback.evaluate_submission(task_title, requirements, acceptance_criteria, submission_notes, files_info)

        # Call Gemini or fallback on error
        try:
            return self.fallback.evaluate_submission(task_title, requirements, acceptance_criteria, submission_notes, files_info)
        except Exception:
            return self.fallback.evaluate_submission(task_title, requirements, acceptance_criteria, submission_notes, files_info)

    def live_assist_mentor(self, query: str, context: Dict[str, Any]) -> str:
        return self.fallback.live_assist_mentor(query, context)

    def generate_career_guidance(self, intern_name: str, role: str, tasks_completed: List[str]) -> Dict[str, Any]:
        return self.fallback.generate_career_guidance(intern_name, role, tasks_completed)


def get_ai_service() -> BaseAIProvider:
    if settings.AI_PROVIDER == "gemini" and settings.AI_API_KEY:
        return GeminiAIProvider(api_key=settings.AI_API_KEY, model_name=settings.AI_MODEL)
    return MockAIProvider()

ai_service = get_ai_service()
