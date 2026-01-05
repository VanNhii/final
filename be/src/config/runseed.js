/* eslint-disable no-console */
// ====================================================
// VN LINKED SEEDER (ONE FILE) - FULL FIXED VERSION
// FIXES:
// 1) Salary bands no longer "explode" by +0..12m (keeps seniority realistic)
// 2) Candidate salary expectation aligned with expYears band
// 3) Soft skills are NOT all required (nice-to-have, lower weight)
// 4) Minor realism: some core skills become nice-to-have (small prob)
// 5) Added quick audit report for salary/seniority sanity
//
// RUN:
//   MONGODB_URI="mongodb+srv://..." node runseed_linked_vn_full_fixed.js
// ====================================================

const mongoose = require("mongoose");
const { faker } = require("@faker-js/faker");
const slugify = require("slugify");

// ====== MODELS (adjust paths) ======
const User = require("./models/User");
const Recruiter = require("./models/Recruiter");
const Candidate = require("./models/Candidate");
const JobCategory = require("./models/JobCategory");
const Job = require("./models/Job");

// ====== CONFIG ======

const DB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://nhivv21it_db_user:DATN123@vannhidatn.x9ziwvd.mongodb.net/datn_1?appName=VanNhiDATN";

const NUM_CANDIDATES = Number(process.env.NUM_CANDIDATES || 73);
const NUM_RECRUITERS = Number(process.env.NUM_RECRUITERS || 70);
const NUM_JOBS = Number(process.env.NUM_JOBS || 85);

const JOB_BATCH_SIZE = Number(process.env.JOB_BATCH_SIZE || 500);
const CAND_LOG_EVERY = Number(process.env.CAND_LOG_EVERY || 100);

const SAVED_JOBS_NOISE_PROB = Number(process.env.SAVED_JOBS_NOISE_PROB || 0.12); // 12% noise
const SAVED_JOBS_MIN = Number(process.env.SAVED_JOBS_MIN || 3);
const SAVED_JOBS_MAX = Number(process.env.SAVED_JOBS_MAX || 12);

faker.seed(20251221);

// ====================================================
// ===== YOUR PROVIDED CONSTANTS (KEEP MOSTLY) =========
// ====================================================

const CITIES = [
  "Hồ Chí Minh", "Hồ Chí Minh", "Hồ Chí Minh", "Hồ Chí Minh",
  "Đà Nẵng", "Đà Nẵng", "Đà Nẵng", "Đà Nẵng",
  "Huế", "Huế", "Huế",
  "Hà Nội", "Hà Nội", "Hà Nội",
  "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Thái Nguyên", "Vinh", "Nam Định", "Hải Dương",
  "Nha Trang", "Quy Nhơn", "Đà Lạt", "Buôn Ma Thuột", "Phan Thiết", "Thanh Hóa",
  "Bình Dương", "Đồng Nai", "Vũng Tàu", "Cần Thơ", "Long An", "Tiền Giang", "Kiên Giang"
];

const VN_UNIVERSITIES = [
  "Đại học Bách Khoa Hà Nội", "Đại học Công nghệ - ĐHQGHN (UET)", "Học viện Công nghệ Bưu chính Viễn thông (PTIT)",
  "Đại học Kinh tế Quốc dân (NEU)", "Đại học Công nghiệp Hà Nội (HaUI)", "Đại học Giao thông Vận tải",
  "Học viện Kỹ thuật Quân sự", "Đại học Thủy lợi",
  "Đại học Bách Khoa - Đại học Đà Nẵng", "Đại học Kinh tế - Đại học Đà Nẵng", "Đại học Sư phạm Kỹ thuật - Đại học Đà Nẵng",
  "Đại học Công nghệ thông tin và Truyền thông Việt - Hàn (VKU)", "Đại học Duy Tân (DTU)", "Đại học Đông Á",
  "Đại học FPT Đà Nẵng", "Đại học Khoa học - Đại học Huế", "Đại học Vinh",
  "Đại học Bách Khoa - ĐHQG TP.HCM", "Đại học Công nghệ thông tin - ĐHQG TP.HCM (UIT)", "Đại học Khoa học Tự nhiên - ĐHQG TP.HCM",
  "Đại học Sư phạm Kỹ thuật TP.HCM", "Đại học FPT TP.HCM", "Đại học Công nghiệp TP.HCM (IUH)",
  "Đại học Hoa Sen", "Đại học Tôn Đức Thắng", "Đại học Cần Thơ"
];

// ===== CATEGORY_TREE (as you provided) =====
const CATEGORY_TREE = {
  "Phát Triển Phần Mềm": [
    "Frontend Developer",
    "Backend Developer",
    "Fullstack Developer",
    "Software Engineer (General)",
    "Embedded Developer",
    "Game Developer",
    "Desktop Application Developer",
    "Kỹ sư ERP/Enterprise",
    "QA Automation Engineer (in Dev Team)",
  ],
  "Khoa Học Dữ Liệu & AI": [
    "Data Analyst",
    "Data Scientist",
    "Data Engineer",
    "ML Engineer",
    "AI Engineer",
    "MLOps Engineer",
    "NLP Engineer",
    "Computer Vision Engineer",
    "Business Intelligence Specialist",
  ],
  "Hạ Tầng & DevOps": [
    "DevOps Engineer",
    "Site Reliability Engineer (SRE)",
    "Cloud Engineer (AWS/Azure/GCP)",
    "Platform Engineer",
    "Infrastructure Engineer",
    "Network Engineer",
    "System Administrator",
    "Database Administrator (DBA)",
  ],
  "An Ninh Mạng": [
    "Security Engineer",
    "Application Security Engineer (AppSec)",
    "Cloud Security Engineer",
    "Pentester",
    "SOC Analyst",
    "Blue Team Engineer",
    "Red Team Engineer",
    "GRC Specialist",
    "Security Architect",
  ],
  "Phát Triển Di Động": [
    "iOS Developer (Swift/Objective-C)",
    "Android Developer (Kotlin/Java)",
    "Flutter Developer",
    "React Native Developer",
    "Mobile Game Developer",
    "Mobile QA Engineer",
  ],
  "Kiểm Thử & Đảm Bảo Chất Lượng": [
    "Manual QA Engineer",
    "Automation QA Engineer",
    "Performance Tester",
    "QA Lead",
    "SDET",
    "Test Manager",
    "QA/QC Engineer",
  ],
  "Thiết Kế & Sản Phẩm": [
    "UI Designer",
    "UX Designer",
    "Product Designer",
    "Product Manager",
    "Technical Product Manager",
    "Business Analyst",
    "Scrum Master",
  ],
  "Hỗ Trợ Kỹ Thuật & Vận Hành": [
    "Technical Support Engineer",
    "IT Helpdesk",
    "Customer Success Engineer",
    "Solutions Engineer",
    "Implementation Engineer",
  ],
};

// ===== ROLE_SKILLS (as you provided - long) =====
// (Keep your original ROLE_SKILLS here; shortened in this comment for readability)
const ROLE_SKILLS = {
  "Frontend Developer": [
    "JavaScript","TypeScript","ReactJS","Next.js","Vue.js","Angular","HTML5","CSS3",
    "Tailwind CSS","Sass","Redux/Zustand","Web Performance","Accessibility (a11y)","Testing (Jest/RTL)","Cypress",
  ],
  "Backend Developer": [
    "Node.js","Express","NestJS","Java Spring Boot","Python FastAPI","Django","GoLang",".NET Core",
    "Microservices","REST API","GraphQL","PostgreSQL","MongoDB","Redis","Kafka/RabbitMQ","Auth (JWT/OAuth2)","System Design","Caching",
  ],
  "Fullstack Developer": [
    "ReactJS","Node.js","TypeScript","REST API","GraphQL","MongoDB","PostgreSQL","Docker","CI/CD","AWS","Testing","System Design",
  ],
  "Software Engineer (General)": [
    "Data Structures","Algorithms","OOP","Design Patterns","Git","Unit Testing","CI/CD","System Design","Debugging",
  ],
  "Embedded Developer": ["C/C++","Embedded Linux","RTOS","ARM","Device Driver","I2C","SPI","UART","Firmware","Debugging (JTAG)"],
  "Game Developer": ["Unity","C#","Unreal Engine","C++","Shader","Game Physics","Optimization","Networking (Game)","3D Math"],
  "Desktop Application Developer": ["C#",".NET","WPF","WinForms","SQL Server","MVVM","Packaging/Installer","Performance Tuning"],
  "Kỹ sư ERP/Enterprise": ["ERP","SAP","Odoo","SQL","Business Process","Integration","Reporting","Workflow"],
  "QA Automation Engineer (in Dev Team)": ["Automation Testing","Playwright","Cypress","Selenium","API Testing","Postman","CI/CD","Test Strategy"],
  "Data Analyst": ["SQL","Excel","Power BI","Tableau","Statistics","Data Cleaning","Dashboarding","Business Metrics"],
  "Business Intelligence Specialist": ["ETL","Data Warehouse","Dim/Fact Modeling","SQL","Power BI","SSIS","Airflow","Data Quality"],
  "Data Engineer": ["SQL","Python","Spark","Airflow","Kafka","ETL/ELT","Data Lake","BigQuery/Snowflake","Data Modeling","Monitoring Pipelines"],
  "Data Scientist": ["Python","Pandas","NumPy","Statistics","Machine Learning","Model Evaluation","Feature Engineering","TensorFlow/PyTorch"],
  "ML Engineer": ["Python","Sklearn","Model Serving","Docker","Kubernetes","MLflow","Feature Store","MLOps"],
  "AI Engineer": ["LLM","RAG","Prompt Engineering","Embeddings","Vector DB","LangChain","Python","Evaluation","Guardrails"],
  "MLOps Engineer": ["MLflow","CI/CD","Docker","Kubernetes","Monitoring","Model Registry","A/B Testing","Python"],
  "NLP Engineer": ["NLP","Transformers","Tokenization","Text Classification","NER","LLM","Python"],
  "Computer Vision Engineer": ["OpenCV","Object Detection","Image Segmentation","PyTorch/TensorFlow","Data Augmentation","Model Optimization"],
  "DevOps Engineer": ["Linux","Docker","Kubernetes","CI/CD (GitHub Actions/GitLab)","Terraform","AWS/Azure/GCP","Monitoring","Shell Scripting"],
  "Site Reliability Engineer (SRE)": ["Linux","Observability","Incident Response","SLO/SLI","Kubernetes","Automation","Capacity Planning"],
  "Cloud Engineer (AWS/Azure/GCP)": ["AWS","Azure","GCP","IAM","Networking","Terraform","Serverless","Security Basics"],
  "Platform Engineer": ["Kubernetes","Internal Developer Platform","CI/CD","Observability","Terraform","Service Mesh"],
  "Infrastructure Engineer": ["Linux","Networking","Virtualization","Monitoring","Automation","Backup/DR"],
  "Network Engineer": ["TCP/IP","Routing/Switching","Firewall","VPN","DNS","Load Balancing","Network Monitoring"],
  "System Administrator": ["Linux","Windows Server","Active Directory","Backup/DR","Scripting","Monitoring"],
  "Database Administrator (DBA)": ["PostgreSQL/MySQL","Indexing","Performance Tuning","Backup/Restore","Replication","Security","Query Optimization"],
  "Security Engineer": ["OWASP","Threat Modeling","Vulnerability Management","SIEM","Incident Response","Cloud Security"],
  "Application Security Engineer (AppSec)": ["OWASP Top 10","SAST/DAST","Secure Coding","Threat Modeling","Dependency Scanning","DevSecOps"],
  "Cloud Security Engineer": ["IAM","Cloud Security","Network Security","CSPM","Logging/Monitoring","Terraform Security"],
  "Pentester": ["Burp Suite","Nmap","Metasploit","Web Pentest","Report Writing","Privilege Escalation"],
  "SOC Analyst": ["SIEM","Log Analysis","Incident Response","EDR","Threat Hunting","Triage"],
  "Blue Team Engineer": ["Detection Engineering","SIEM","EDR","Threat Hunting","Hardening","Playbooks"],
  "Red Team Engineer": ["C2","Phishing","OPSEC","Lateral Movement","Privilege Escalation"],
  "GRC Specialist": ["ISO 27001","Risk Assessment","Compliance","Audit","Policy Writing","Controls"],
  "Security Architect": ["Security Design","Threat Modeling","Zero Trust","Cloud Security","Architecture Review"],
  "Flutter Developer": ["Flutter","Dart","Firebase","REST API","State Management (Bloc/Riverpod)","Testing"],
  "React Native Developer": ["React Native","JavaScript","TypeScript","Redux","API Integration","Performance"],
  "iOS Developer (Swift/Objective-C)": ["Swift","iOS SDK","UIKit","SwiftUI","Combine/RxSwift","Testing","App Store Deploy"],
  "Android Developer (Kotlin/Java)": ["Kotlin","Android SDK","Jetpack Compose","Hilt/Dagger","Coroutines","Testing"],
  "Mobile Game Developer": ["Unity","C#","Mobile Optimization","Ads/IAP","Analytics","Game UI"],
  "Mobile QA Engineer": ["Mobile Testing","Test Case","Bug Report","Appium","Postman","Device Lab"],
  "Manual QA Engineer": ["Test Case","Bug Report","Requirement Analysis","SQL Basic","Postman","Jira"],
  "Automation QA Engineer": ["Playwright","Cypress","Selenium","API Testing","Postman","CI/CD","JavaScript"],
  "Performance Tester": ["JMeter","k6","Load Testing","Monitoring","Bottleneck Analysis","Reporting"],
  "QA Lead": ["Test Strategy","Team Leading","Metrics","Risk Management","Release Planning"],
  SDET: ["Automation","Testing Framework","CI/CD","API Testing","Coding"],
  "Test Manager": ["Test Planning","Resource Management","Quality Metrics","Stakeholder Management"],
  "QA/QC Engineer": ["QC Process","Testing","Defect Management","Documentation"],
  "UI Designer": ["Figma","Design System","Typography","Color Theory","Prototyping","Handoff"],
  "UX Designer": ["User Research","Wireframe","Prototype","Usability Testing","Information Architecture"],
  "Product Designer": ["Figma","UX","UI","Design Thinking","Design System","Handoff"],
  "Product Manager": ["Roadmap","Agile","OKRs","Jira","Stakeholder Management","Market Research"],
  "Technical Product Manager": ["System Design","API","Roadmap","Agile","Data","Technical Specs"],
  "Business Analyst": ["UML","BPMN","SQL","Jira","User Stories","BRD/SRS"],
  "Scrum Master": ["Scrum","Facilitation","Coaching","Sprint Planning","Retrospective"],
  "Technical Support Engineer": ["Troubleshooting","Logs Analysis","SQL Basic","Customer Communication","Ticketing"],
  "IT Helpdesk": ["Windows","Networking Basics","Hardware","Ticketing","Troubleshooting"],
  "Customer Success Engineer": ["Product Knowledge","Onboarding","Communication","Problem Solving","Analytics"],
  "Solutions Engineer": ["Pre-sales","Demo","Architecture","API Integration","Customer Requirements"],
  "Implementation Engineer": ["Deployment","Configuration","Integration","Training","Support Handover"],
};

const SOFT_SKILLS = [
  "Problem Solving","Critical Thinking","Effective Communication","English Fluency","Agile/Scrum Mindset",
  "Time Management","Leadership & Mentoring","Adaptability","Emotional Intelligence","Negotiation",
  "Presentation Skills","Creative Thinking","Self-learning","Collaboration","Conflict Management",
  "Work under pressure","Ownership","Attention to Detail","Customer-centric","Data-driven Thinking",
  "Stakeholder Management","Growth Mindset","Resilience","Prioritization","Active Listening"
];

const TECH_UNIVERSE = [
  "React","Next.js","Vue.js","Nuxt","Angular","Svelte","Vite","Webpack","Rollup","Tailwind CSS","Sass","Styled-components","Storybook",
  "Node.js","Express","NestJS","Spring Boot","Quarkus","FastAPI","Django","Flask",".NET Core","Go","gRPC",
  "MongoDB","PostgreSQL","MySQL","SQL Server","Redis","Elasticsearch","OpenSearch",
  "Docker","Kubernetes","Helm","GitHub Actions","GitLab CI","Jenkins","AWS","GCP","Azure","Terraform","Ansible","Nginx","Traefik",
  "Prometheus","Grafana","ELK Stack","OpenTelemetry","Jaeger","Sentry",
  "Pandas","NumPy","Spark","Airflow","MLflow","PyTorch","TensorFlow","HuggingFace","RAG","Vector DB","FAISS","Milvus","Pinecone",
  "React Native","Flutter","Firebase","SwiftUI","Jetpack Compose",
  "Selenium","Playwright","Cypress","Postman","JMeter","k6",
  "OWASP","Burp Suite","Nmap","WAF","IAM","Vault",
  "Kafka","RabbitMQ","SQS",
  "REST","GraphQL",
];

// ====================================================
// Vietnamese Name + Email (unique)
// ====================================================
const VIETNAMESE_LAST_NAMES = [
  "Nguyễn","Trần","Lê","Phạm","Hoàng","Huỳnh","Phan","Vũ","Võ","Đặng","Bùi","Đỗ","Hồ","Ngô","Dương","Lý"
];
const VIETNAMESE_MIDDLE_NAMES = [
  "Văn","Thị","Hữu","Minh","Quang","Ngọc","Đức","Thanh","Anh","Phúc","Gia","Tuấn","Hoài","Khánh"
];

function generateVietnameseName() {
  const last = faker.helpers.arrayElement(VIETNAMESE_LAST_NAMES);
  const mid = faker.helpers.arrayElement(VIETNAMESE_MIDDLE_NAMES);
  const first = faker.person.firstName("vi");
  return { first_name: first, last_name: `${last} ${mid}` };
}

function normalizeVietnamese(str) {
  if (!str) return "user";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
}

function pickEmailDomain() {
  return faker.helpers.weightedArrayElement([
    { value: "gmail.com", weight: 8 },
    { value: "outlook.com", weight: 1 },
    { value: "yahoo.com", weight: 0.5 },
    { value: "icloud.com", weight: 0.5 },
  ]);
}

let EMAIL_COUNTER = Date.now();

function generateVietnameseEmail(firstName, lastName) {
  EMAIL_COUNTER++;
  const fn = normalizeVietnamese(firstName);
  const ln = normalizeVietnamese(lastName);
  const domain = pickEmailDomain();
  const num = EMAIL_COUNTER % 100000;
  const handle = `${ln}.${fn}${num}`.replace(/[^a-z0-9.]/g, "");
  return `${handle}@${domain}`;
}

function generateVietnamesePhone() {
  const prefixes = ["03", "05", "07", "08", "09"];
  return faker.helpers.arrayElement(prefixes) + faker.string.numeric(8);
}

// ====================================================
// Helpers
// ====================================================
function slug(text) {
  return slugify(text, { lower: true, strict: true, locale: "vi" });
}

function companyName() {
  const prefixes = ["CTCP", "Cty TNHH", "Tập đoàn", "Công ty"];
  const mid = ["Công nghệ", "Phần mềm", "Giải pháp", "Sáng tạo", "Dữ liệu", "An ninh"];
  const suffix = ["JSC", "Group", "Vietnam", "Global", "Tech", "Labs"];
  return `${faker.helpers.arrayElement(prefixes)} ${faker.company.name()} ${faker.helpers.arrayElement(mid)} ${faker.helpers.arrayElement(suffix)}`;
}

function buildRoleToParentMap(tree) {
  const map = new Map();
  for (const parent of Object.keys(tree)) {
    for (const child of tree[parent]) map.set(child, parent);
  }
  return map;
}
const ROLE_TO_PARENT = buildRoleToParentMap(CATEGORY_TREE);

function getSkillPool(role) {
  const pool = ROLE_SKILLS[role];
  if (pool && pool.length) return pool;
  return faker.helpers.arrayElements(TECH_UNIVERSE, 12);
}

function million(m) {
  return Math.round(m) * 1_000_000;
}

// ====================================================
// Job enums - match your Job model enum
// ====================================================
const SENIORITIES = ["Entry", "Junior", "Mid", "Senior", "Lead", "Executive"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const WORK_LOCATIONS = ["On-site", "Remote", "Hybrid"];
const EDUCATION_REQUIRED = ["high_school", "associate", "bachelor", "master", "doctorate", "not_required"];

// Salary/experience band by seniority (VN-level demo realistic)
const SENIORITY_RULES = {
  Entry: { expMin: 0, expMax: 1, salMin: 3, salMax: 8 },
  Junior: { expMin: 1, expMax: 2, salMin: 8, salMax: 15 },
  Mid: { expMin: 2, expMax: 5, salMin: 15, salMax: 30 },
  Senior: { expMin: 5, expMax: 10, salMin: 30, salMax: 60 },
  Lead: { expMin: 7, expMax: 15, salMin: 50, salMax: 90 },
  Executive: { expMin: 10, expMax: 20, salMin: 80, salMax: 150 },
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// FIXED salary generator: stay in band, with tiny outliers
function generateSalaryBySeniority(seniority) {
  const rule = SENIORITY_RULES[seniority] || SENIORITY_RULES.Mid;
  const bandMin = rule.salMin;
  const bandMax = rule.salMax;

  // pick min within band, slightly above floor
  const minM = faker.number.int({ min: bandMin, max: Math.max(bandMin, bandMax - 6) });

  // max within band, ensure gap >= 3m
  const maxWithin = faker.number.int({ min: minM + 3, max: bandMax });

  // 3–5% outlier: slightly above band (but not crazy)
  const isOutlier = faker.datatype.boolean({ probability: 0.05 });
  const maxM = isOutlier ? maxWithin + faker.number.int({ min: 3, max: 8 }) : maxWithin;

  return {
    salaryMin: million(minM),
    salaryMax: million(Math.max(maxM, minM + 3)),
    isOutlier,
  };
}

// Candidate seniority from expYears (simple)
function candidateSeniorityFromExp(expYears) {
  if (expYears <= 0) return "Entry";
  if (expYears <= 2) return "Junior";
  if (expYears <= 5) return "Mid";
  if (expYears <= 10) return "Senior";
  return "Lead";
}

function generateCandidateSalaryExpectation(expYears) {
  const s = candidateSeniorityFromExp(expYears);
  const rule = SENIORITY_RULES[s] || SENIORITY_RULES.Mid;

  const bandMin = rule.salMin;
  const bandMax = rule.salMax;

  // candidate min: near lower-mid band; max: near upper band
  const minM = faker.number.int({ min: bandMin, max: Math.max(bandMin, bandMax - 8) });
  const maxM = faker.number.int({ min: minM + 4, max: bandMax });

  // small realism: some candidates ask higher
  const askHigh = faker.datatype.boolean({ probability: 0.08 });
  const maxM2 = askHigh ? maxM + faker.number.int({ min: 3, max: 10 }) : maxM;

  return { min: million(minM), max: million(Math.max(maxM2, minM + 4)) };
}

// ====================================================
// Candidate Experience technologies diversity
// ====================================================
function pickTechnologiesForExperience(roleSkillPool, expYears) {
  const base = roleSkillPool && roleSkillPool.length ? roleSkillPool : ["Git", "REST", "SQL"];

  const basePick = faker.helpers.arrayElements(base, faker.number.int({ min: 2, max: Math.min(6, base.length) }));
  const extraPick = faker.helpers.arrayElements(TECH_UNIVERSE, faker.number.int({ min: 0, max: 4 }));

  const opsPick =
    expYears >= 3 && faker.datatype.boolean({ probability: 0.55 })
      ? faker.helpers.arrayElements(
          ["Docker", "Kubernetes", "AWS", "GitHub Actions", "Terraform", "Prometheus", "Grafana", "Sentry"],
          faker.number.int({ min: 1, max: 3 })
        )
      : [];

  const driftPick =
    faker.datatype.boolean({ probability: 0.3 })
      ? faker.helpers.arrayElements(["OpenTelemetry", "Jaeger", "ELK Stack", "OpenSearch", "Helm", "Vault"], 1)
      : [];

  const merged = Array.from(new Set([...basePick, ...extraPick, ...opsPick, ...driftPick]));
  return merged.slice(0, faker.number.int({ min: 3, max: 9 }));
}

function buildCandidateExperience(role, roleSkillPool, expYears, city) {
  if (!expYears || expYears === 0) return [];

  const jobsCount =
    expYears <= 2 ? faker.number.int({ min: 1, max: 2 }) :
    expYears <= 5 ? faker.number.int({ min: 2, max: 3 }) :
    faker.number.int({ min: 3, max: 4 });

  const experiences = [];
  let cursorYear = 2024 - expYears;

  for (let i = 0; i < jobsCount; i++) {
    const durationMonths = faker.number.int({ min: 6, max: 28 });

    const start = new Date(`${cursorYear}-01-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    const technologies = pickTechnologiesForExperience(roleSkillPool, expYears);
    const isCurrent = i === 0 && faker.datatype.boolean({ probability: 0.25 });

    const position = faker.helpers.arrayElement([
      `${role}`,
      `Junior ${role}`,
      `Senior ${role}`,
      `Member - ${role}`,
      `Engineer - ${role}`,
    ]);

    experiences.push({
      company_name: companyName(),
      position,
      start_date: start,
      end_date: isCurrent ? null : end,
      is_current: isCurrent,
      description: `Tham gia dự án ${faker.hacker.adjective()} tại ${city}. Phụ trách ${faker.hacker.verb()} hệ thống, tập trung vào ${technologies.slice(0, 4).join(", ")}.`,
      technologies,
    });

    cursorYear += Math.max(1, Math.floor(durationMonths / 12));
  }

  return experiences;
}

// ====================================================
// Job content generation by parent category
// ====================================================
function parentTemplate(parent, role, seniority, coreSkills) {
  const skillsStr = coreSkills.join(", ");
  const soft = faker.helpers.arrayElements(SOFT_SKILLS, 2).join(" / ");

  switch (parent) {
    case "Khoa Học Dữ Liệu & AI":
      return {
        description: `Chúng tôi đang tìm kiếm ${seniority} ${role} tham gia vào dự án ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Xử lý dữ liệu, phân tích, xây dựng pipeline hoặc mô hình tuỳ dự án
- Đảm bảo chất lượng dữ liệu, logging/monitoring, báo cáo kết quả
- Tech stack: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Thành thạo: ${skillsStr}`,
          `- Nắm chắc SQL/Python và tư duy dữ liệu`,
          `- Có kinh nghiệm ETL/ELT, Airflow/Spark là lợi thế`,
          `- Giao tiếp tốt, teamwork tốt`,
        ].join("\n"),
      };

    case "Hạ Tầng & DevOps":
      return {
        description: `Chúng tôi đang tìm ${seniority} ${role} cho hệ thống ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Triển khai CI/CD, IaC, tối ưu hệ thống production
- Observability/Alerting, xử lý incident, nâng SLO/SLI
- Stack: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Thành thạo: ${skillsStr}`,
          `- Có kinh nghiệm vận hành production, troubleshooting`,
          `- Hiểu security basics, backup/DR là lợi thế`,
          `- Làm việc tốt dưới áp lực`,
        ].join("\n"),
      };

    case "An Ninh Mạng":
      return {
        description: `Chúng tôi cần ${seniority} ${role} để nâng cao bảo mật cho sản phẩm ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Threat modeling, đánh giá rủi ro, hardening, logging
- Phối hợp xử lý sự cố và cải tiến quy trình
- Tools/Skills: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Nắm vững: ${skillsStr}`,
          `- Có kỹ năng viết báo cáo, tư duy cẩn trọng`,
          `- Ưu tiên ứng viên có kinh nghiệm IR/DevSecOps`,
          `- Giao tiếp rõ ràng`,
        ].join("\n"),
      };

    case "Phát Triển Di Động":
      return {
        description: `Chúng tôi tìm ${seniority} ${role} cho dự án mobile ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Phát triển tính năng, tối ưu UX & hiệu năng
- Tích hợp API, quản lý state, testing & release
- Stack: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Thành thạo: ${skillsStr}`,
          `- Hiểu lifecycle/performance, có kinh nghiệm deploy là lợi thế`,
          `- Có tư duy sản phẩm và teamwork tốt`,
          `- Chủ động học hỏi`,
        ].join("\n"),
      };

    case "Kiểm Thử & Đảm Bảo Chất Lượng":
      return {
        description: `Chúng tôi cần ${seniority} ${role} để đảm bảo chất lượng sản phẩm ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Viết test case, thực thi test, quản lý defect
- Xây dựng automation và tích hợp CI/CD (tuỳ vị trí)
- Tools/Skills: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Thành thạo: ${skillsStr}`,
          `- Có tư duy phân tích yêu cầu & báo cáo lỗi rõ ràng`,
          `- Biết API testing là lợi thế`,
          `- Chủ động, trách nhiệm`,
        ].join("\n"),
      };

    case "Thiết Kế & Sản Phẩm":
      return {
        description: `Chúng tôi tìm ${seniority} ${role} để phát triển sản phẩm ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Nghiên cứu người dùng, xây prototype/roadmap/spec
- Phối hợp dev để triển khai đúng mục tiêu
- Skills: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Thành thạo: ${skillsStr}`,
          `- Có tư duy người dùng, giao tiếp tốt`,
          `- Biết Agile/Jira là lợi thế`,
          `- Có portfolio/spec mẫu là lợi thế`,
        ].join("\n"),
      };

    case "Hỗ Trợ Kỹ Thuật & Vận Hành":
      return {
        description: `Chúng tôi tìm ${seniority} ${role} để hỗ trợ triển khai/vận hành sản phẩm ${faker.hacker.adjective()}.

**Mô tả công việc:**
- Tiếp nhận ticket, phân tích log, xử lý sự cố
- Hỗ trợ triển khai/integration và đào tạo người dùng
- Skills: ${skillsStr}

**Kỹ năng mềm:** ${soft}

${faker.lorem.paragraphs(1)}`,
        requirements: [
          `- Troubleshooting tốt, ưu tiên: ${skillsStr}`,
          `- Giao tiếp tốt và kiên nhẫn`,
          `- Biết đọc log/SQL cơ bản là lợi thế`,
          `- Chủ động phối hợp`,
        ].join("\n"),
      };

    default:
      return {
        description: `Chúng tôi đang tìm ${seniority} ${role} cho dự án ${faker.hacker.adjective()}.\n\nStack: ${skillsStr}\n\n${faker.lorem.paragraphs(1)}`,
        requirements: `- Thành thạo: ${skillsStr}\n- Teamwork tốt\n- Chủ động học hỏi`,
      };
  }
}

function buildBenefits(parent) {
  const base = [
    "Lương tháng 13 + thưởng hiệu suất",
    "BHXH đầy đủ + bảo hiểm sức khỏe",
    "Laptop/thiết bị làm việc",
    "Ngân sách học tập/chứng chỉ",
    "Du lịch/teambuilding định kỳ",
    "Phụ cấp ăn trưa, gửi xe, điện thoại",
  ];
  const extraMap = {
    "Hạ Tầng & DevOps": ["Phụ cấp on-call", "Remote/Hybrid linh hoạt", "Tools monitoring premium"],
    "Khoa Học Dữ Liệu & AI": ["GPU/Compute budget", "Hỗ trợ hội thảo", "Data tooling premium"],
    "An Ninh Mạng": ["Security training/cert budget", "Lab/CTF support", "Quyền chủ động cải tiến quy trình"],
    "Thiết Kế & Sản Phẩm": ["User research budget", "Quarterly product bonus"],
    "Hỗ Trợ Kỹ Thuật & Vận Hành": ["Customer success bonus", "Lịch làm linh hoạt"],
  };
  const merged = [...base, ...(extraMap[parent] || [])];
  return faker.helpers.arrayElements(merged, faker.number.int({ min: 5, max: Math.min(7, merged.length) })).join("\n");
}

// ====================================================
// SEED 1) Categories (parent/child)
// ====================================================
async function seedCategories() {
  console.log("\n🌱 Seeding JobCategory (parent/child)...");
  await JobCategory.deleteMany({});

  const parents = Object.keys(CATEGORY_TREE).map((parentName) => ({
    category_name: parentName,
    description: `Tất cả công việc liên quan đến ${parentName.toLowerCase()}`,
    parent_category_id: null,
    slug: slug(parentName),
    is_active: true,
  }));

  const insertedParents = await JobCategory.insertMany(parents, { ordered: false });

  const children = [];
  for (const parent of insertedParents) {
    for (const childName of CATEGORY_TREE[parent.category_name]) {
      children.push({
        category_name: childName,
        description: `Chuyên sâu về ${childName} trong lĩnh vực ${parent.category_name}`,
        parent_category_id: parent._id,
        slug: slug(childName),
        is_active: true,
      });
    }
  }

  const insertedChildren = await JobCategory.insertMany(children, { ordered: false });
  console.log(`✅ Categories: ${insertedParents.length} parents + ${insertedChildren.length} children`);
  return insertedChildren;
}

// ====================================================
// SEED 2) Recruiters (User + Recruiter)
// ====================================================
async function seedRecruiters() {
  console.log("\n🏢 Seeding Recruiter Users + Recruiters...");
  await Recruiter.deleteMany({});

  const recruiters = [];
  for (let i = 0; i < NUM_RECRUITERS; i++) {
    const { first_name, last_name } = generateVietnameseName();
    const email = generateVietnameseEmail(first_name, last_name);

    const user = await User.create({
      email,
      password: "Password123",
      first_name,
      last_name,
      phone: generateVietnamesePhone(),
      role: "recruiter",
      account_status: "approved",
      avatar_url: faker.image.avatar(),
    });

    const cName = companyName();
    const city = faker.helpers.arrayElement(CITIES);

    const recruiter = await Recruiter.create({
      user_id: user._id,
      company_name: cName,
      company_description: faker.lorem.paragraphs(2),
      company_size: faker.helpers.arrayElement(["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001+"]),
      industry: faker.helpers.arrayElement(["Fintech", "E-commerce", "AI/ML", "SaaS", "Gaming", "EdTech", "HealthTech", "Logistics", "Banking", "Telecom"]),
      website: faker.internet.url(),
      company_email: generateVietnameseEmail("hr", normalizeVietnamese(cName).slice(0, 16) || "company"),
      company_phone: generateVietnamesePhone(),
      company_address: `${faker.location.streetAddress()}, ${city}`,
      founded_year: faker.number.int({ min: 1990, max: 2023 }),
      company_locations: [{ city, address: faker.location.streetAddress(), is_headquarters: true }],
      logo_url: faker.image.url({ width: 200, height: 200 }),
      is_verified: faker.datatype.boolean({ probability: 0.85 }),
      subscription_plan: faker.helpers.arrayElement(["basic", "premium", "enterprise"]),
      contact_person_name: `${last_name} ${first_name}`,
      contact_email: generateVietnameseEmail(first_name, last_name),
      contact_phone: generateVietnamesePhone(),
      position: faker.helpers.arrayElement(["HR Manager", "Recruitment Lead", "Talent Acquisition", "HRBP"]),
    });

    recruiters.push(recruiter);
  }

  console.log(`✅ Recruiters created: ${recruiters.length}`);
  return recruiters;
}

// ====================================================
// Build skills_required realism: core required, soft nice-to-have
// ====================================================
function buildSkillsRequired(coreSkills, softSkills) {
  // some core become "nice-to-have" (small prob)
  const core = coreSkills.map((s) => {
    const nice = faker.datatype.boolean({ probability: 0.18 }); // 18% core as nice-to-have
    return {
      skill_name: s,
      is_required: !nice,
      weight: !nice
        ? faker.number.int({ min: 7, max: 15 })
        : faker.number.int({ min: 3, max: 8 }),
    };
  });

  // soft skills almost always NOT required, low weight
  const soft = softSkills.map((s) => ({
    skill_name: s,
    is_required: false,
    weight: faker.number.int({ min: 1, max: 5 }),
  }));

  return [...core, ...soft];
}

// ====================================================
// SEED 3) Jobs
// ====================================================
async function seedJobs(recruiters, childCategories) {
  console.log("\n💼 Seeding Jobs...");
  await Job.deleteMany({});

  let batch = [];
  let inserted = 0;

  for (let i = 0; i < NUM_JOBS; i++) {
    const recruiter = faker.helpers.arrayElement(recruiters);
    const category = faker.helpers.arrayElement(childCategories);

    const role = category.category_name;
    const parent = ROLE_TO_PARENT.get(role) || "Phát Triển Phần Mềm";

    const seniority = faker.helpers.arrayElement(SENIORITIES);
    const rule = SENIORITY_RULES[seniority];

    // FIXED SALARY
    const { salaryMin, salaryMax } = generateSalaryBySeniority(seniority);

    const skillPool = getSkillPool(role);
    const coreSkills = faker.helpers.arrayElements(
      skillPool,
      faker.number.int({ min: 3, max: Math.min(8, skillPool.length) })
    );
    const soft = faker.helpers.arrayElements(SOFT_SKILLS, 2);

    const skills_required = buildSkillsRequired(coreSkills, soft);

    const job_type = faker.helpers.arrayElement(JOB_TYPES);
    const work_location =
      job_type === "Freelance"
        ? faker.helpers.arrayElement(["Remote", "Hybrid"])
        : faker.helpers.arrayElement(WORK_LOCATIONS);

    const city = faker.helpers.arrayElement(CITIES);

    const content = parentTemplate(parent, role, seniority, coreSkills);

    batch.push({
      recruiter_id: recruiter._id,
      category_id: category._id,
      categories: [category._id],

      title: `${seniority} ${role} (${city})`,
      description: content.description,
      requirements: content.requirements,
      benefits: buildBenefits(parent),

      salary_min: salaryMin,
      salary_max: salaryMax,

      job_type,
      work_location,
      seniority_level: seniority,
      education_required: faker.helpers.arrayElement(EDUCATION_REQUIRED),

      location: {
        address: work_location === "Remote" ? "Toàn quốc" : faker.location.streetAddress(),
        city,
        country: "Vietnam",
      },

      experience_required: { min: rule.expMin, max: rule.expMax },

      skills_required,

      status: "approved",
      is_active: true,
      application_deadline: faker.date.future({ years: 0.5 }),

      company_name: recruiter.company_name,
      is_featured: faker.datatype.boolean({ probability: 0.1 }),
      views_count: faker.number.int({ min: 50, max: 50000 }),
      applications_count: faker.number.int({ min: 0, max: 700 }),
      tags: [slug(role), slug(seniority), slug(work_location)],
    });

    if (batch.length >= JOB_BATCH_SIZE) {
      const res = await Job.insertMany(batch, { ordered: false });
      inserted += res.length;
      batch = [];
      if ((i + 1) % (JOB_BATCH_SIZE * 2) === 0) {
        console.log(`  -> inserted ${inserted}/${NUM_JOBS} jobs...`);
      }
    }
  }

  if (batch.length > 0) {
    const res = await Job.insertMany(batch, { ordered: false });
    inserted += res.length;
  }

  const total = await Job.countDocuments();
  console.log(`✅ Jobs created: ${total}`);
}

// ====================================================
// SEED 4) Candidates (User + Candidate)
// ====================================================
async function seedCandidates(childCategories) {
  console.log("\n👤 Seeding Candidate Users + Candidates...");
  await Candidate.deleteMany({});

  const jobsLean = await Job.find({}, { _id: 1, category_id: 1 }).lean();

  const jobsByCategory = new Map();
  for (const j of jobsLean) {
    const key = String(j.category_id);
    if (!jobsByCategory.has(key)) jobsByCategory.set(key, []);
    jobsByCategory.get(key).push(j);
  }

  const roleToCategoryId = new Map();
  for (const c of childCategories) roleToCategoryId.set(c.category_name, String(c._id));
  const roles = childCategories.map((c) => c.category_name);

  for (let i = 0; i < NUM_CANDIDATES; i++) {
    const { first_name, last_name } = generateVietnameseName();
    const email = generateVietnameseEmail(first_name, last_name);

    const role = faker.helpers.arrayElement(roles);
    const skillPool = getSkillPool(role);

    const expYears = faker.helpers.weightedArrayElement([
      { value: 0, weight: 2 },
      { value: faker.number.int({ min: 1, max: 2 }), weight: 4 },
      { value: faker.number.int({ min: 3, max: 5 }), weight: 3 },
      { value: faker.number.int({ min: 6, max: 10 }), weight: 1 },
    ]);

    const city = faker.helpers.arrayElement(CITIES);

    const user = await User.create({
      email,
      password: "Password123",
      first_name,
      last_name,
      phone: generateVietnamesePhone(),
      role: "candidate",
      account_status: "approved",
      avatar_url: faker.image.avatar(),
    });

    const uni = faker.helpers.arrayElement(VN_UNIVERSITIES);
    const gradYear = 2024 - Math.min(10, Math.max(0, expYears));

    const coreSkills = faker.helpers.arrayElements(
      skillPool,
      faker.number.int({ min: 3, max: Math.min(7, skillPool.length) })
    );
    const soft = faker.helpers.arrayElements(SOFT_SKILLS, 2);
    const combined = Array.from(new Set([...coreSkills, ...soft]));

    const skills_detailed = combined.map((s) => ({
      skill_name: s,
      skill_level: expYears >= 5 ? "advanced" : expYears >= 2 ? "intermediate" : "beginner",
      years_of_experience: Math.max(0, expYears),
      is_primary: faker.datatype.boolean({ probability: 0.35 }),
    }));

    const experience = buildCandidateExperience(role, skillPool, expYears, city);

    // FIXED candidate salary expectation (aligned to expYears band)
    const salary_expectation = generateCandidateSalaryExpectation(expYears);

    // saved_jobs with noise
    const savedCount = faker.number.int({ min: SAVED_JOBS_MIN, max: SAVED_JOBS_MAX });
    const noise = faker.datatype.boolean({ probability: SAVED_JOBS_NOISE_PROB });

    let savedRaw = [];
    if (noise) {
      savedRaw = faker.helpers.arrayElements(jobsLean, Math.min(savedCount, jobsLean.length)).map((p) => p._id);
    } else {
      const roleCatId = roleToCategoryId.get(role);
      const source = roleCatId ? jobsByCategory.get(roleCatId) || [] : [];
      const pool = source.length ? source : jobsLean;
      const picks = faker.helpers.arrayElements(pool, Math.min(savedCount, pool.length));
      savedRaw = picks.map((p) => p._id);
    }

    const saved_jobs = Array.from(new Set(savedRaw.map((x) => String(x)))).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    await Candidate.create({
      user_id: user._id,
      date_of_birth: faker.date.birthdate({ min: 21, max: 35, mode: "age" }),
      gender: faker.helpers.arrayElement(["male", "female", "other"]),
      city,
      address: `${faker.location.streetAddress()}, ${city}`,
      education_level: faker.helpers.arrayElement(["high_school", "associate", "bachelor", "master", "doctorate", "other"]),
      experience_years: expYears,
      salary_expectation,
      job_status: expYears === 0 ? "seeking" : faker.helpers.arrayElement(["employed", "seeking", "not_seeking"]),
      bio: `Ứng viên định hướng ${role}. Tốt nghiệp ${uni}. Mong muốn làm việc tại ${city}.`,
      education: [
        {
          school_name: uni,
          degree: "Bachelor",
          major: role,
          start_date: new Date(`${gradYear - 4}-09-01`),
          end_date: new Date(`${gradYear}-06-30`),
          is_current: false,
        },
      ],
      experience,
      skills_detailed,
      saved_jobs,
    });

    if ((i + 1) % CAND_LOG_EVERY === 0) console.log(`  -> candidates: ${i + 1}/${NUM_CANDIDATES}`);
  }

  const total = await Candidate.countDocuments();
  console.log(`✅ Candidates created: ${total}`);
}

// ====================================================
// SAFE REPORT + AUDIT
// ====================================================
async function reportSafe() {
  const [u, r, c, cat, j] = await Promise.all([
    User.countDocuments(),
    Recruiter.countDocuments(),
    Candidate.countDocuments(),
    JobCategory.countDocuments(),
    Job.countDocuments(),
  ]);

  console.log("\n📈 === REPORT ===");
  console.log(`Users:       ${u}`);
  console.log(`Recruiters:  ${r}`);
  console.log(`Candidates:  ${c}`);
  console.log(`Categories:  ${cat}`);
  console.log(`Jobs:        ${j}`);

  const topCities = await Job.aggregate([
    { $group: { _id: "$location.city", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 7 },
  ]);

  console.log("\nTop job cities:");
  topCities.forEach((x) => console.log(`- ${x._id}: ${x.count}`));

  const topSeniority = await Job.aggregate([
    { $group: { _id: "$seniority_level", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 6 },
  ]);

  console.log("\nSeniority distribution:");
  topSeniority.forEach((x) => console.log(`- ${x._id}: ${x.count}`));

  const badSalary = await Job.countDocuments({ $expr: { $lte: ["$salary_max", "$salary_min"] } });
  console.log(`\nSalary sanity (salary_max <= salary_min): ${badSalary}`);

  const salaryBySeniority = await Job.aggregate([
    {
      $group: {
        _id: "$seniority_level",
        count: { $sum: 1 },
        avgMin: { $avg: "$salary_min" },
        avgMax: { $avg: "$salary_max" },
        minMin: { $min: "$salary_min" },
        maxMax: { $max: "$salary_max" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  console.log("\nSalary by seniority (avgMin/avgMax, minMin, maxMax):");
  salaryBySeniority.forEach((x) => {
    const fmt = (v) => Math.round(v / 1_000_000) + "m";
    console.log(
      `- ${x._id}: count=${x.count} avg=[${fmt(x.avgMin)}..${fmt(x.avgMax)}] range=[${fmt(x.minMin)}..${fmt(x.maxMax)}]`
    );
  });

  const sample = await Candidate.collection
    .find({}, { projection: { saved_jobs: 1, experience: 1, salary_expectation: 1, experience_years: 1 } })
    .limit(10)
    .toArray();

  console.log(
    `\nSample saved_jobs counts: ${sample.map((x) => (x.saved_jobs || []).length).join(", ")}`
  );
  console.log(
    `Sample experience entries: ${sample.map((x) => (x.experience || []).length).join(", ")}`
  );
  console.log(
    `Sample salary_expectation: ${sample
      .map((x) => `${x.experience_years}y=[${Math.round((x.salary_expectation?.min || 0)/1e6)}..${Math.round((x.salary_expectation?.max || 0)/1e6)}]m`)
      .join(" | ")}`
  );
}

// ====================================================
// MAIN
// ====================================================
async function run() {
  console.log("🚀 VN LINKED SEEDER - START (FIXED)");
  console.log(`Target: ${NUM_JOBS} jobs, ${NUM_CANDIDATES} candidates, ${NUM_RECRUITERS} recruiters`);
  console.log(`Noise saved_jobs: ${(SAVED_JOBS_NOISE_PROB * 100).toFixed(0)}%`);
  console.log("NOTE: Ensure you rotated any leaked DB credentials. Use env MONGODB_URI only.");

  try {
    await mongoose.connect(DB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 });
    console.log("✅ MongoDB connected");

    // NOTE:
    // - We delete Recruiter/Candidate/Job/Category in this script
    // - We do NOT delete User to avoid nuking your real users
    // If you want to wipe seeded users too, you can add a marker field or filter.

    const childCategories = await seedCategories();
    const recruiters = await seedRecruiters();
    await seedJobs(recruiters, childCategories);
    await seedCandidates(childCategories);

    await reportSafe();

    console.log("\n✨ DONE");
  } catch (err) {
    console.error("🔥 Seeder error:", err?.message || err);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected");
  }
}

run();
