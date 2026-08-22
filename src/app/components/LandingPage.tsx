'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LandingPage.module.css';

const steps = [
  ['01', 'Tell EchoAI your symptoms', 'Speak naturally. EchoAI identifies urgency and brings your secure medical history into the conversation.'],
  ['02', 'Clinician matching', 'Connect with a verified doctor or nurse who can see the details that matter before the call begins.'],
  ['03', 'Action & care', 'Receive immediate video or voice care, practical next steps, and a safe handoff when needed.'],
];

const testimonials = [
  ['“Emergency Echo’s voice AI recognised my mother’s stroke symptoms in seconds. The immediate connection to a verified doctor absolutely saved her life.”', 'Sarah J.', 'Patient'],
  ['“As a triage nurse, the pre-clerking AI is a game changer. I receive the patient’s history and vitals before I even say hello.”', 'Oluwaseun T., RN', 'Healthcare provider'],
  ['“The encrypted patient records mean I no longer worry about data breaches when discussing sensitive cases.”', 'Dr. M. Kalu', 'Senior physician'],
  ['“Partnering with Emergency Echo has driven a massive increase in triage volume and enabled seamless handoffs for critical cases.”', 'Dr. Chidi B.', 'Clinic director'],
];

const team = [
  ['nurudeen.jpg', 'Dr. Kadiri Nurudeen', 'Co-CEO', 'Product & Tech · Medical Expert', 'AI Architecture · NDPR Compliance'],
  ['yewande.jpg', 'Miss Kadiri Yewande', 'Co-CEO', 'Marketing & Growth · Brand Strategy', 'Fundraising · Partnerships'],
  ['tobi.jpg', 'Mr. Tobi Badun', 'CTO', 'System Design & Data Ops', 'Cloud Infrastructure · Security'],
  ['obalanlege.jpg', 'Dr. Balogun Ayodimeji', 'UX Designer', 'UX & User Journey · Medical UX', 'Accessibility · Stress-tested Design'],
  ['nathaniel.png', 'Mr. Nathaniel T.O., AMICDFA', 'Cybersecurity Lead', 'Security Architecture', 'Threat Mitigation · NDPA Compliance'],
];

function Brand() {
  return <span className={styles.brand}><img src="/assets/emergencyecho.png" alt="Emergency Echo" /><span>EmergencyEcho</span></span>;
}

function CheckList({ items }: { items: string[] }) {
  return <ul className={styles.checkList}>{items.map((item) => <li key={item}><span>✓</span>{item}</li>)}</ul>;
}

export default function LandingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hours, setHours] = useState(20);

  useEffect(() => {
    const saved = localStorage.getItem('landing-theme') as 'light' | 'dark' | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('landing-theme', next);
  };

  const echoEarnings = hours * 4 * 6000;
  const locumEarnings = hours * 4 * 2000;

  return <main className={`${styles.page} ${theme === 'dark' ? styles.dark : ''}`}>
    <header className={styles.header}>
      <a className={styles.brandLink} href="#top" aria-label="Emergency Echo home"><Brand /></a>
      <nav className={styles.nav} aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#testimonials">Testimonials</a><a href="#team">Team</a></nav>
      <div className={styles.actions}><button className={styles.themeButton} onClick={toggleTheme} aria-label="Toggle colour theme">{theme === 'light' ? '☾' : '☀'}</button><button className={styles.loginButton} onClick={() => router.push('/login')}>Log in</button><button className={styles.primaryButton} onClick={() => router.push('/register')}>Get started</button></div>
    </header>

    <section className={styles.hero} id="top"><div className={styles.heroInner}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}>Care when every second counts</p><h1>Instant medical guidance,<br /><em>everywhere,</em><br />when it <em>matters.</em></h1><p className={styles.heroText}>Voice-activated AI triage, encrypted medical records, and verified clinicians — instantly. The response system built for Africa and beyond.</p><div className={styles.heroButtons}><button className={styles.primaryButton} onClick={() => router.push('/register')}>Get started</button><button className={styles.secondaryButton} onClick={() => router.push('/register')}>Try EchoAI for free</button></div><div className={styles.storeButtons}><span><b>Coming soon</b><img src="/assets/appstore.png" alt="Download on the App Store" /></span><span><b>Coming soon</b><img src="/assets/playstore.png" alt="Get it on Google Play" /></span></div></div>
      <div className={styles.heroDevices} aria-label="Emergency Echo mobile app previews"><img className={styles.profilePhone} src="/assets/echo6.png" alt="Emergency Echo patient profile" /><img className={styles.sessionPhone} src="/assets/echo5.png" alt="Emergency Echo emergency session" /></div>
    </div></section>

    <section className={`${styles.section} ${styles.how}`} id="how-it-works"><div className={styles.sectionHeading}><p className={styles.kicker}>How it works</p><h2>How Emergency Echo <em>saves lives</em></h2><p>A clear, three-step journey to a faster medical response.</p></div><div className={styles.stepGrid}>{steps.map(([number, title, copy]) => <article className={styles.stepCard} key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className={`${styles.section} ${styles.story}`} id="features"><div className={styles.storyCopy}><p className={styles.kicker}>For patients</p><h2>The <em>patient</em> experience</h2><h3>Digital Medical Kit & voice access</h3><p>Keep your critical medical history safely encrypted and ready to share when seconds matter.</p><CheckList items={['Voice-activated emergency triggers', 'One-tap sharing with family and EMS', 'Secure document vault for test results']} /><div className={styles.note}><strong>Quick consultations</strong><p><b>5-minute sessions:</b> ideal for quick triage, refills, minor rashes, and general health questions.</p><p><b>10-minute sessions:</b> designed for detailed symptoms, paediatric concerns, and follow-ups.</p></div></div><div className={styles.deviceFrame}><img src="/assets/echo digital emergency kit.png" alt="Digital Medical Kit on a phone" /></div></section>

    <section className={`${styles.section} ${styles.story} ${styles.professional}`}><div className={styles.deviceFrame}><img src="/assets/echo quick response from doctors.png" alt="Emergency Echo clinician dashboard on a phone" /></div><div className={styles.storyCopy}><p className={styles.kicker}>For clinicians</p><h2>The <em>professional</em> advantage</h2><h3>Empowering doctors and nurses</h3><p>Streamline your practice with AI-assisted clerking, live vital feeds, and an integrated digital wallet.</p><CheckList items={['Pre-triaged patient queue', 'Live vital dashboard for critical cases', 'Instant payout processing via in-app wallet']} /><div className={styles.calculator}><div className={styles.calculatorTop}><strong>Earning potential</strong><span>{hours} hrs/week</span></div><input aria-label="Hours worked per week" type="range" min="5" max="50" step="5" value={hours} onChange={(event) => setHours(Number(event.target.value))} /><div className={styles.earnings}><div><small>Traditional locum</small><b>₦{locumEarnings.toLocaleString()}</b><span>estimated monthly</span></div><div><small>Emergency Echo</small><b>₦{echoEarnings.toLocaleString()}</b><span>estimated monthly</span></div></div></div></div></section>

    <section className={styles.stats} aria-label="Emergency Echo statistics"><div><b>1.4M+</b><span>Records secured</span></div><div><b>99.9%</b><span>Uptime SLA</span></div><div><b>10K+</b><span>Verified doctors and nurses</span></div><div><b>&lt; 5s</b><span>AI response</span></div></section>

    <section className={`${styles.section} ${styles.testimonials}`} id="testimonials"><div className={styles.sectionHeading}><p className={styles.kicker}>Real stories</p><h2>Trusted by <em>thousands</em></h2><p>Real impact stories from users and medical professionals.</p></div><div className={styles.testimonialGrid}>{testimonials.map(([quote, name, role]) => <figure key={name}><blockquote>{quote}</blockquote><figcaption><b>{name}</b><span>{role}</span></figcaption></figure>)}</div></section>

    <section className={`${styles.section} ${styles.security}`} id="security"><div className={styles.storyCopy}><p className={styles.kicker}>Your privacy</p><h2>Security and <em>privacy</em> first</h2><h3>NDPR compliant & encrypted</h3><p>Your medical information is deeply personal. We protect it with banking-grade encryption and role-based access.</p><CheckList items={['End-to-end encryption on video calls', 'Secure vault for medical documents', 'Doctors only see what you approve']} /></div><div className={styles.lock} aria-hidden="true">🔒</div></section>

    <section className={`${styles.section} ${styles.team}`} id="team"><div className={styles.sectionHeading}><p className={styles.kicker}>Our people</p><h2>Meet the team behind <em>Emergency Echo</em></h2><p>Multidisciplinary. Mission-driven. Africa-ready.</p></div><div className={styles.teamGrid}>{team.map(([image, name, role, primary, secondary]) => <article key={name}><img src={`/assets/team/${image}`} alt={name} /><h3>{name}</h3><strong>{role}</strong><p>{primary}</p><small>{secondary}</small></article>)}</div></section>

    <section className={styles.finalCta}><p className={styles.kicker}>Ready when it matters</p><h2>Be ready when it matters most.</h2><button className={styles.primaryButton} onClick={() => router.push('/register')}>Join Emergency Echo today</button></section>
    <footer className={styles.footer}><Brand /><div className={styles.socials}><a href="#top" aria-label="Facebook">f</a><a href="#top" aria-label="X">𝕏</a><a href="#top" aria-label="Instagram">◎</a><a href="#top" aria-label="LinkedIn">in</a></div><div className={styles.footerLinks}><a href="#top">About</a><a href="#top">FAQ</a><a href="#top">Contact</a><a href="#security">Privacy</a><a href="#top">Terms</a></div><p>© 2026 EmergencyEcho · A Yenak Technology product. All rights reserved.</p></footer>
  </main>;
}
