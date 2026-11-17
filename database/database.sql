-- Import into a newly-created MySQL 8 / MariaDB database.
-- Configure credentials in config/local.php after import.
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  attempted_at DATETIME NOT NULL,
  successful TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_login_throttle (username_hash, ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  stored_name VARCHAR(190) NOT NULL UNIQUE,
  thumbnail_name VARCHAR(190) NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  alt_text VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_media_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS content_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  module VARCHAR(40) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(190) NOT NULL DEFAULT '',
  summary TEXT NULL,
  body MEDIUMTEXT NULL,
  meta_json JSON NULL,
  cover_media_id BIGINT UNSIGNED NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_module_slug (module, slug),
  KEY idx_module_publication (module, status, sort_order),
  KEY idx_featured (module, featured),
  CONSTRAINT fk_content_cover_media FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_images (
  project_id BIGINT UNSIGNED NOT NULL,
  media_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, media_id),
  KEY idx_project_images_media (media_id),
  CONSTRAINT fk_project_images_project FOREIGN KEY (project_id) REFERENCES content_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_images_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  media_id BIGINT UNSIGNED NOT NULL,
  module VARCHAR(40) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  field_name VARCHAR(50) NOT NULL DEFAULT 'cover',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_media_assignment (media_id, module, record_id, field_name),
  KEY idx_assignment_target (module, record_id),
  CONSTRAINT fk_assignment_media FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS website_settings (
  setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flexible records use a module whitelist in the API: projects, experiences,
-- skills, achievements, certifications, education, leadership, events, gallery,
-- services, and social_links. JSON stores module-specific attributes.
INSERT INTO website_settings (setting_key, setting_value) VALUES
('site_title', 'Mahmoud Elfaham — Biomedical Engineer & Data Analyst'),
('site_description', 'Mahmoud Elfaham connects biomedical engineering, data analytics, healthcare technology, and innovation.'),
('footer_tagline', 'Engineering Ideas. Analyzing Data. Creating Impact.')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO profile (id, data) VALUES (1, JSON_OBJECT(
  'name','Mahmoud Elfaham',
  'title','Biomedical Engineer & Data Analyst',
  'headline','Biomedical Engineer | Data Analyst | Innovation & Leadership',
  'location','Egypt',
  'university','Shorouk Academy',
  'institution','Higher Institute of Engineering',
  'major','Biomedical & Systems Engineering',
  'degree','Bachelor’s Degree',
  'graduation_year','2026',
  'overall_grade','65%',
  'project_grade','Excellent',
  'current_position','Data Analyst',
  'current_organization','ICTI',
  'languages','Arabic — Native\nEnglish — B1\nGerman — A1.1',
  'hero_intro','I bridge the gap between engineering, data, and technology. With a background in Biomedical & Systems Engineering and hands-on experience in data analytics, healthcare technology, and product innovation, I transform complex ideas into practical solutions that create meaningful impact.',
  'about_lead','I am a Biomedical & Systems Engineering graduate from Shorouk Academy with a multidisciplinary professional background spanning healthcare technology, data analytics, engineering systems, and innovation.',
  'about_body','Currently working as a Data Analyst at ICTI, I contribute to data preparation, analysis, Power BI dashboard development, management reporting, and client presentations. Beyond analytics, I participate in product ideation and developing technology-driven concepts for potential clients and projects involving government entities.\n\nThroughout my university journey, I developed strong leadership and organizational experience, serving as Vice President of the Engineering Students Union, Head of the TICO Office, and Biomedical Engineering Department Representative.\n\nI have also led engineering projects, instructed students in C++ programming through IEEE activities, and contributed to organizing major academic events, including the 3rd International Conference on Engineering.\n\nMy approach combines analytical thinking, engineering problem-solving, creativity, and leadership to turn ideas into practical solutions.',
  'career_objective','My objective is to build a career at the intersection of Biomedical Engineering, Data Analytics, Artificial Intelligence, and Healthcare Technology. I aspire to contribute to innovative organizations by transforming data into insights, engineering challenges into practical solutions, and ideas into valuable products. Through continuous learning, technical development, and leadership, I aim to create meaningful impact in technology-driven industries, particularly healthcare and data-oriented environments.',
  'portrait_media_id',null
)) ON DUPLICATE KEY UPDATE data = VALUES(data);

INSERT INTO content_records (module,slug,title,category,summary,body,meta_json,status,sort_order,featured) VALUES
('projects','medlink','MedLink: Smart Health Card System','Healthcare Technology | IoT | NFC','An NFC-based healthcare information system designed to provide quick access to essential patient health information through a smart health card.','Designed and developed the project database; developed the NFC system; integrated the NFC card with the healthcare information system; led the project team.',JSON_OBJECT('technologies',JSON_ARRAY('NFC','Database','Healthcare systems'),'role','Team Leader · Database & NFC integration','grade','Excellent','achievements',JSON_ARRAY('3rd Place — Military Production Scientific Exhibition, IoT Category','Top 10 — Ebdaa Competition','Participant — Made in Egypt Competition'),'type','Graduation Project'), 'published',1,1),
('projects','maher','Maher: Enterprise AI Assistant','Artificial Intelligence | Product Innovation','An enterprise AI assistant product concept designed to support organizational workflows and intelligent business interactions.','Originated the product idea; developed the initial concept and product design; prepared professional client presentations; contributed to communicating the product’s value and capabilities.',JSON_OBJECT('technologies',JSON_ARRAY('AI product concept','Product design','Presentations'),'role','Product ideation & concept development','organization','ICTI'), 'published',2,1),
('projects','el-miri-icu','El-Miri ICU Management System','Healthcare Software Development','A web-based Intensive Care Unit management application with Arabic and English support, dark mode, ICU management functionality, and database integration.','',JSON_OBJECT('technologies',JSON_ARRAY('HTML','CSS','JavaScript','Bootstrap','PHP','MySQL'),'role','Healthcare software project'), 'published',3,0),
('projects','spectrophotometer-lis','Advanced Spectrophotometer & LIS','Biomedical Engineering | Laboratory Technology','An advanced spectrophotometer project integrated with a Laboratory Information System and QR code functionality.','',JSON_OBJECT('technologies',JSON_ARRAY('Spectrophotometer','LIS','QR Code')), 'published',4,0),
('projects','eeg-signal-processing','EEG Signal Processing','Biomedical Signal Processing | MATLAB','An application developed to process EEG signals and distinguish between normal and abnormal signal patterns.','',JSON_OBJECT('technologies',JSON_ARRAY('MATLAB','EEG','Signal processing')), 'published',5,0),
('projects','clinic-reservation','Clinic Reservation Application','C++ GUI','A clinic reservation application built as a C++ GUI project.','',JSON_OBJECT('technologies',JSON_ARRAY('C++')), 'published',6,0),
('projects','hospital-database','Hospital Database','SQL','A hospital database project.','',JSON_OBJECT('technologies',JSON_ARRAY('SQL')), 'published',7,0),
('projects','smart-incubator','Smart Incubator','Arduino | Healthcare Monitoring','A smart incubator project focused on healthcare monitoring.','',JSON_OBJECT('technologies',JSON_ARRAY('Arduino','Healthcare monitoring')), 'published',8,0),
('projects','infusion-pump','Infusion Pump Control System','Embedded Systems','An infusion pump control system developed as an embedded systems project.','',JSON_OBJECT('technologies',JSON_ARRAY('Embedded systems')), 'published',9,0),
('projects','multi-function-machine','Multi-Function Machine','PIC Microcontrollers','A multi-function machine project using PIC microcontrollers.','',JSON_OBJECT('technologies',JSON_ARRAY('PIC microcontrollers')), 'published',10,0),
('experiences','icti-data-analyst','Data Analyst','ICTI | Egypt','Data preparation, analysis, Power BI dashboards, reporting, business presentations, and product ideation.','Perform data cleaning and preparation; analyze datasets and extract actionable insights; develop interactive Power BI dashboards; prepare management and client reports; create business presentations; contribute to product concepts and technology-led initiatives.',JSON_OBJECT('employment','Full-time','period','July 2026 — Present','previous','Part-time before graduation','skills',JSON_ARRAY('Data preparation','Power BI','Reporting','Product ideation')), 'published',1,0),
('experiences','nasser-trainee','Biomedical / Clinical Engineering Trainee','Nasser Institute for Oncology','Clinical and biomedical engineering training in a healthcare environment.','',JSON_OBJECT('period','August 15 — September 15, 2023'), 'published',2,0),
('experiences','imc-trainee','Clinical Engineering Trainee','International Medical Center (IMC)','Exposure to medical equipment and healthcare operations in a clinical engineering environment.','',JSON_OBJECT('period','August 2023'), 'published',3,0),
('experiences','nti-training','Data Analysis Training','National Telecommunication Institute (NTI)','30 hours of data analysis training.','',JSON_OBJECT('period','Date not specified','hours',30), 'published',4,0),
('experiences','endoscopy-training','Endoscopy Training','Clinical Training','Endoscopy training.','',JSON_OBJECT('period','Date not specified'), 'published',5,0),
('experiences','entrepreneurship-training','Entrepreneurship & Business Development Training','Professional Development','Entrepreneurship and business development training.','',JSON_OBJECT('period','Date not specified'), 'published',6,0),
('experiences','ai-diploma','Artificial Intelligence Diploma','Professional Development','Five of 21 sessions completed.','',JSON_OBJECT('period','In progress'), 'published',7,0),
('experiences','nvidia-dli','Deep Learning Institute Certificate','NVIDIA','NVIDIA Deep Learning Institute certificate.','',JSON_OBJECT('period','Date not specified'), 'published',8,0),
('skills','data-analysis','Data Analytics & Business Intelligence','Data Analytics','Data analysis, cleaning, statistics, visualization, BI and reporting tools.','',JSON_OBJECT('items',JSON_ARRAY('Data Analysis','Data Cleaning','Statistics','Data Visualization','Power BI','SQL','MySQL','Excel','PowerPoint')), 'published',1,0),
('skills','programming','Programming & Development','Programming','Programming languages and web development.','',JSON_OBJECT('items',JSON_ARRAY('Python','C++','HTML','CSS','JavaScript','PHP','MATLAB')), 'published',2,0),
('skills','embedded','Embedded Systems & Electronics','Engineering','Microcontrollers, embedded systems, IoT, sensors and measurements.','',JSON_OBJECT('items',JSON_ARRAY('Arduino','ESP32','PIC Microcontrollers','Embedded Systems','IoT Applications','Sensors & Measurements')), 'published',3,0),
('skills','biomedical','Biomedical Engineering','Healthcare','Biomedical and clinical engineering, equipment and healthcare technology.','',JSON_OBJECT('items',JSON_ARRAY('Biomedical Engineering','Clinical Engineering','Medical Equipment','Healthcare Technology','Medical Systems','Biomedical Instrumentation')), 'published',4,0),
('skills','professional','Professional & Business Skills','Professional','Leadership, communication, product thinking and event coordination.','',JSON_OBJECT('items',JSON_ARRAY('Team Leadership','Project Management','Product Ideation','Innovation','Entrepreneurship','Public Speaking','Event Management','Business Presentations','Communication','Problem Solving')), 'published',5,0),
('achievements','student-year','Student of the Year — 2026','University Level','Received the Student of the Year award at Shorouk Academy in 2026.','',JSON_OBJECT('year','2026','recognition','Shorouk Academy'), 'published',1,1),
('achievements','military-production','3rd Place — Military Production Competition','Scientific Exhibition | IoT','Achieved third place with the MedLink Smart Health Card project.','',JSON_OBJECT('academic_year','2025/2026','project','MedLink'), 'published',2,0),
('achievements','ebdaa-top-ten','Top 10 — Ebdaa Competition','Graduation Project','MedLink reached the Top 10.','',JSON_OBJECT('project','MedLink'), 'published',3,0),
('achievements','made-in-egypt','Made in Egypt Competition','Healthcare Innovation','Participated with the MedLink project.','',JSON_OBJECT('project','MedLink'), 'published',4,0),
('achievements','union-vice-president','Vice President — Engineering Students Union','Student Leadership','Official recognition for obtaining the Vice President position.','',JSON_OBJECT('organization','Shorouk Academy'), 'published',5,0),
('certifications','nvidia-certificate','NVIDIA Deep Learning Institute Certificate','Artificial Intelligence','NVIDIA Deep Learning Institute certificate.','',JSON_OBJECT('date','Date not specified'), 'published',1,0),
('certifications','nti-data-analysis','NTI Data Analysis Training — 30 Hours','Data Analytics','30 hours of Data Analysis Training at the National Telecommunication Institute.','',JSON_OBJECT('hours',30,'date','Date not specified'), 'published',2,0),
('certifications','ai-diploma-cert','Artificial Intelligence Diploma','Artificial Intelligence','Previously completed 5 out of 21 sessions.','',JSON_OBJECT('completion','5 of 21 sessions','date','In progress'), 'published',3,0),
('certifications','entrepreneurship-cert','Entrepreneurship & Business Development Training','Business','Entrepreneurship and business development training.','',JSON_OBJECT('date','Date not specified'), 'published',4,0),
('education','biomedical-degree','Bachelor’s Degree in Biomedical & Systems Engineering','Shorouk Academy — Higher Institute of Engineering','Graduated in 2026 with an overall grade of 65%; graduation project grade: Excellent.','',JSON_OBJECT('year','2026','overall_grade','65%','project_grade','Excellent'), 'published',1,0),
('leadership','engineering-union','Vice President — Engineering Students Union','Shorouk Academy','Student representation, team coordination, organizational leadership, student initiatives and activities.','Progression: Union Member; Cultural Committee Secretary; Vice President of the Engineering Students Union.',JSON_OBJECT('progression',JSON_ARRAY('Union Member','Cultural Committee Secretary','Vice President')), 'published',1,1),
('leadership','tico-head','Head — TICO Office','Entrepreneurship & Innovation','Supported entrepreneurship initiatives, innovation, student activities and entrepreneurial projects.','',JSON_OBJECT(), 'published',2,0),
('leadership','department-representative','Biomedical Engineering Department Representative','Academic Representation','Contributed to communication and coordination between students and academic administration.','',JSON_OBJECT(), 'published',3,0),
('leadership','engineering-team-leader','Team Leader — University Engineering Projects','Project Leadership','Led project teams, distributed responsibilities, monitored implementation and coordinated activities toward project objectives.','',JSON_OBJECT(), 'published',4,0),
('leadership','ieee-instructor','C++ Programming Instructor','IEEE Activities','Taught C++ fundamentals, explained programming concepts and supported students’ technical development.','',JSON_OBJECT(), 'published',5,0),
('events','international-conference','3rd International Conference on Engineering','Shorouk Academy','Supported organization of a major academic event.','Team coordination, communication, and on-the-day organization.',JSON_OBJECT('type','Conference'), 'published',1,0),
('events','graduation-ceremonies','Graduation Project Ceremonies','Academic Events','Supported graduation project ceremonies.','',JSON_OBJECT('type','University event'), 'published',2,0),
('events','career-fair','University Employment & Career Fair','Career Development','Contributed to organizing the university employment and career fair.','',JSON_OBJECT('type','Career fair'), 'published',3,0),
('events','union-events','Engineering Students Union Events','Student Leadership','Coordinated student activities and Engineering Students Union events.','',JSON_OBJECT('type','Student events'), 'published',4,0),
('events','innovation-events','Entrepreneurship & Innovation Events','Innovation','Supported entrepreneurship and innovation events.','',JSON_OBJECT('type','Innovation events'), 'published',5,0),
('gallery','gallery-medlink','Graduation Project','project','MedLink graduation project photo placeholder.','',JSON_OBJECT('alt','MedLink graduation project','media_id',null), 'published',1,0),
('gallery','gallery-engineering','Engineering Projects','project','Engineering projects photo placeholder.','',JSON_OBJECT('alt','Engineering projects','media_id',null), 'published',2,0),
('gallery','gallery-leadership','Student Leadership','leadership','Student leadership photo placeholder.','',JSON_OBJECT('alt','Student leadership','media_id',null), 'published',3,0),
('gallery','gallery-events','University Events','events','University events photo placeholder.','',JSON_OBJECT('alt','University events','media_id',null), 'published',4,0),
('gallery','gallery-training','Teaching & Training','training','Teaching and training photo placeholder.','',JSON_OBJECT('alt','Teaching and training','media_id',null), 'published',5,0),
('gallery','gallery-awards','Competitions & Awards','events','Competitions and awards image placeholder.','',JSON_OBJECT('alt','Competitions and awards','media_id',null), 'published',6,0),
('gallery','gallery-professional','Professional Activities','training','Professional activities image placeholder.','',JSON_OBJECT('alt','Professional activities','media_id',null), 'published',7,0),
('services','service-analytics','Data Analytics & Business Intelligence','Analytics','Data preparation, statistical analysis, reporting, and interactive Power BI dashboards.','',JSON_OBJECT(), 'published',1,0),
('services','service-healthcare','Healthcare Technology Solutions','Healthcare','Biomedical engineering applications, healthcare systems, and medical technology projects.','',JSON_OBJECT(), 'published',2,0),
('services','service-development','Technical Project Development','Engineering','Engineering prototypes, embedded systems, IoT applications, and technical project coordination.','',JSON_OBJECT(), 'published',3,0),
('services','service-innovation','Product Innovation & Presentations','Innovation','Product ideation, initial concept development, creative problem-solving, and professional business presentations.','',JSON_OBJECT(), 'published',4,0),
('social_links','linkedin','LinkedIn','professional','Professional profile','',JSON_OBJECT('url','https://www.linkedin.com/in/mahmoud-elfaham-728249241/','label','LinkedIn'), 'published',1,0),
('social_links','youtube','YouTube — Coding with Elfaham','video','Coding with Elfaham','',JSON_OBJECT('url','https://www.youtube.com/@CodingwithElfaham/videos','label','YouTube'), 'published',2,0)
ON DUPLICATE KEY UPDATE title=VALUES(title),category=VALUES(category),summary=VALUES(summary),body=VALUES(body),meta_json=VALUES(meta_json),status=VALUES(status),sort_order=VALUES(sort_order),featured=VALUES(featured);
