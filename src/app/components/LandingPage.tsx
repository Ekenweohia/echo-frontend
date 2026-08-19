'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return (
    <div style={landingWrapperStyle}>
      {/* Navbar */}
      <header style={navStyle} className="glass-panel">
        <div style={logoWrapperStyle}>
          <img src="/assets/emergencyecho.png" alt="EmergencyEcho Logo" style={{ height: '32px', objectFit: 'contain' }} />
          <span style={logoTextStyle}>EmergencyEcho</span>
        </div>

        <nav style={navLinksStyle}>
          <a href="#how-it-works" style={navLinkStyle}>How it works</a>
          <a href="#features" style={navLinkStyle}>Features</a>
          <a href="#security" style={navLinkStyle}>Security</a>
          <a href="#testimonials" style={navLinkStyle}>Testimonials</a>
          <a href="#team" style={navLinkStyle}>Team</a>
        </nav>

        <div style={navActionsStyle}>
          <button onClick={toggleTheme} style={themeToggleBtnStyle} title="Toggle Dark/Light Mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => router.push('/login')} style={loginLinkStyle}>Log in</button>
          <button onClick={() => router.push('/register')} style={btnGetStartedStyle}>Get started</button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={heroSectionStyle}>
        <div style={heroLeftStyle}>
          <h1 style={heroTitleStyle}>
            Instant medical guidance, <span style={highlightTextStyle}>everywhere, when it matters.</span>
          </h1>
          <p style={heroSubTitleStyle}>
            Voice-activated AI triage, encrypted medical records, and verified clinicians - instantly. The ultimate response system built for Africa and beyond.
          </p>

          <div style={heroActionsStyle}>
            <button onClick={() => router.push('/register')} style={heroBtnPrimaryStyle}>Get started</button>
            <button onClick={() => router.push('/register')} style={heroBtnSecondaryStyle}>Try EchoAI for free</button>
          </div>

          {/* Download Badges */}
          <div style={badgeContainerStyle}>
            <div style={appBadgeWrapper}>
              <div style={badgeLabelStyle}>Coming Soon</div>
              <img src="/assets/appstore.png" alt="App Store" style={{ height: '38px', width: '128px', objectFit: 'contain', cursor: 'pointer' }} />
            </div>
            <div style={appBadgeWrapper}>
              <div style={badgeLabelStyle}>Coming Soon</div>
              <img src="/assets/playstore.png" alt="Play Store" style={{ height: '38px', width: '128px', objectFit: 'contain', cursor: 'pointer' }} />
            </div>
          </div>
        </div>

        {/* Hero Right side: Overlapping Phone Mockup Images directly */}
        <div style={heroRightStyle}>
          {/* Left Phone: Profile screen */}
          <img 
            src="/assets/echo6.png" 
            alt="My Profile Screen Mockup" 
            style={heroPhoneLeftStyle} 
          />
          {/* Right Phone: Active session details */}
          <img 
            src="/assets/echo5.png" 
            alt="Emergency Session Request Mockup" 
            style={heroPhoneRightStyle} 
          />
        </div>
      </section>

      {/* Section 1: How Emergency Echo Saves Lives */}
      <section id="how-it-works" style={infoSectionStyle}>
        <h2 style={sectionTitleStyle}>
          How Emergency Echo <span style={{ color: 'var(--coral-red)' }}>saves lives</span>
        </h2>
        <p style={sectionSubTitleStyle}>A seamless, three-step journey to rapid medical response.</p>

        <div style={cardGridStyle}>
          {/* Card 1 */}
          <div style={stepCardStyle} className="glass-panel">
            <div style={stepNumberStyle}>1</div>
            <h4 style={cardTitleStyle}>Tell EchoAI Your Symptoms</h4>
            <p style={cardDescStyle}>
              Speak naturally. Our AI engine triages your condition and pulls up your pre-saved medical history instantly.
            </p>
          </div>

          {/* Card 2 */}
          <div style={stepCardStyle} className="glass-panel">
            <div style={stepNumberStyle}>2</div>
            <h4 style={cardTitleStyle}>Clinician Matching</h4>
            <p style={cardDescStyle}>
              Depending on urgency, you are connected to verified doctors and nurses with access to your live vitals.
            </p>
          </div>

          {/* Card 3 */}
          <div style={stepCardStyle} className="glass-panel">
            <div style={stepNumberStyle}>3</div>
            <h4 style={cardTitleStyle}>Action & Care</h4>
            <p style={cardDescStyle}>
              Receive immediate video/voice care, step-by-step emergency protocols, or a direct handoff to emergency contacts.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: The Patient Experience */}
      <section id="features" style={featuresSectionStyle}>
        <div style={featuresLeftStyle}>
          <h2 style={sectionTitleStyle}>
            The <span style={{ color: 'var(--coral-red)' }}>Patient</span> Experience
          </h2>
          <h3 style={featureSubHeadingStyle}>Digital Medical Kit & Voice Access</h3>
          <p style={featureDescStyle}>
            Keep your critical medical history safely encrypted yet instantly accessible when seconds matter.
          </p>

          <ul style={checkListStyle}>
            <li style={checkItemStyle}>
              <span style={checkIconStyle}>✓</span> Voice-activated emergency triggers
            </li>
            <li style={checkItemStyle}>
              <span style={checkIconStyle}>✓</span> One-tap sharing with family and EMS
            </li>
            <li style={checkItemStyle}>
              <span style={checkIconStyle}>✓</span> Secure document vault for test results
            </li>
          </ul>

          <div style={consultationsBoxStyle}>
            <span style={boxHeaderStyle}>Quick Consultations</span>
            <div style={boxRowStyle}>
              <strong>5-Minute Sessions:</strong> Perfect for quick triage, prescription refills, minor rashes, or general health questions.
            </div>
            <div style={boxRowStyle}>
              <strong>10-Minute Sessions:</strong> Best for pediatric concerns, detailed symptom evaluation (fever, pain), chronic condition follow-ups, or second opinions.
            </div>
          </div>
        </div>

        {/* Mockup phone displaying QR code / Medical Kit */}
        <div style={featuresRightStyle}>
          <img 
            src="/assets/echo digital emergency kit.png" 
            alt="Emergency Digital Medical ID" 
            style={featuresPhoneStyle} 
          />
        </div>
      </section>

      {/* Section 3: Security and Privacy First */}
      <section id="security" style={securitySectionStyle}>
        <h2 style={sectionTitleStyle}>
          Security and <span style={{ color: 'var(--coral-red)' }}>Privacy</span> First
        </h2>
        
        <div style={securityGridStyle}>
          <div style={securityLeftStyle}>
            <h3 style={securitySubHeadingStyle}>NDPR Compliant & Encrypted</h3>
            <p style={securityDescStyle}>
              Your medical data is your most sensitive information. We protect it with banking-grade encryption, ensuring total compliance with NDPR and international healthcare standards.
            </p>

            <ul style={checkListStyle}>
              <li style={checkItemStyle}>
                <span style={checkIconStyle}>✓</span> End-to-End Encryption on video calls
              </li>
              <li style={checkItemStyle}>
                <span style={checkIconStyle}>✓</span> Secure Vault for medical documents
              </li>
              <li style={checkItemStyle}>
                <span style={checkIconStyle}>✓</span> Role-based access (Doctors only see what you approve)
              </li>
            </ul>
          </div>

          <div style={securityRightStyle}>
            {/* Glowing Golden Padlock SVG */}
            <div style={padlockWrapperStyle}>
              <svg width="90" height="90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="padlockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffb703" />
                    <stop offset="100%" stopColor="#fb8500" />
                  </linearGradient>
                  <linearGradient id="shackleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                  </linearGradient>
                </defs>
                {/* Shackle */}
                <path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="url(#shackleGrad)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Body */}
                <rect x="3" y="10" width="18" height="11" rx="3" fill="url(#padlockGrad)" />
                {/* Keyhole */}
                <circle cx="12" cy="14" r="1.5" fill="#1e293b" />
                <path d="M12 15.5v2.5" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Testimonials */}
      <section id="testimonials" style={infoSectionStyle}>
        <h2 style={sectionTitleStyle}>
          What our <span style={{ color: 'var(--coral-red)' }}>clinicians & patients</span> say
        </h2>
        <p style={sectionSubTitleStyle}>Real reviews from the front lines of emergency care.</p>

        <div style={cardGridStyle}>
          {/* Card 1 */}
          <div style={testimonialCardStyle} className="glass-panel">
            <h4 style={cardTitleStyle}>Dr. Balogun</h4>
            <span style={testimonialSubtitleStyle}>Verified Physician</span>
            <p style={cardDescStyle}>
              "Emergency Echo enables us to view patient vitals instantly, cutting triage delays down to seconds when every heartbeat counts."
            </p>
          </div>

          {/* Card 2 */}
          <div style={testimonialCardStyle} className="glass-panel">
            <h4 style={cardTitleStyle}>Mr. Nathaniel</h4>
            <span style={testimonialSubtitleStyle}>Emergency SOS Patient</span>
            <p style={cardDescStyle}>
              "The SOS location trace let paramedics locate me and read my drug allergy list before they even arrived at the scene. Outstanding response system."
            </p>
          </div>

          {/* Card 3 */}
          <div style={testimonialCardStyle} className="glass-panel">
            <h4 style={cardTitleStyle}>Emergency Care</h4>
            <span style={testimonialSubtitleStyle}>Triage Integration</span>
            <p style={cardDescStyle}>
              "Our clinical voice intake compiles triage logs seamlessly, mapping patient files to optimize doctor-patient video room handoffs."
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Team */}
      <section id="team" style={teamSectionStyle}>
        <h2 style={sectionTitleStyle}>
          Meet the Team behind <span style={{ color: 'var(--coral-red)' }}>Emergency Echo</span>
        </h2>
        <p style={sectionSubTitleStyle}>Multidisciplinary. Mission-Driven. Africa-Ready.</p>

        <div style={teamContainerStyle}>
          {/* Dr. Kadiri Nurudeen */}
          <div style={teamCardStyle} className="glass-panel">
            <div style={teamAvatarWrapper}>
              <img src="/assets/team/nurudeen.jpg" alt="Dr. Kadiri Nurudeen" style={teamAvatarStyle} />
            </div>
            <h4 style={teamNameStyle}>Dr. Kadiri Nurudeen</h4>
            <span style={teamRoleStyle}>CO-CEO</span>
            <span style={teamDetailPrimaryStyle}>Product & Tech • Medical Expert</span>
            <span style={teamDetailSecondaryStyle}>AI Architecture • NDPR Compliance</span>
          </div>

          {/* Miss Kadiri Yewande */}
          <div style={teamCardStyle} className="glass-panel">
            <div style={teamAvatarWrapper}>
              <img src="/assets/team/yewande.jpg" alt="Miss Kadiri Yewande" style={teamAvatarStyle} />
            </div>
            <h4 style={teamNameStyle}>Miss Kadiri Yewande</h4>
            <span style={teamRoleStyle}>CO-CEO</span>
            <span style={teamDetailPrimaryStyle}>Marketing & Growth • Brand Strategy</span>
            <span style={teamDetailSecondaryStyle}>Fundraising • Partnerships</span>
          </div>

          {/* Mr. Tobi Badun */}
          <div style={teamCardStyle} className="glass-panel">
            <div style={teamAvatarWrapper}>
              <img src="/assets/team/tobi.jpg" alt="Mr. Tobi Badun" style={teamAvatarStyle} />
            </div>
            <h4 style={teamNameStyle}>Mr. Tobi Badun</h4>
            <span style={teamRoleStyle}>CTO</span>
            <span style={teamDetailPrimaryStyle}>System Design & Data Ops</span>
            <span style={teamDetailSecondaryStyle}>Cloud Infrastructure • Security</span>
          </div>

          {/* Dr. Balogun Ayodimeji */}
          <div style={teamCardStyle} className="glass-panel">
            <div style={teamAvatarWrapper}>
              <img src="/assets/team/obalanlege.jpg" alt="Dr. Balogun Ayodimeji" style={teamAvatarStyle} />
            </div>
            <h4 style={teamNameStyle}>Dr. Balogun Ayodimeji</h4>
            <span style={teamRoleStyle}>UX DESIGNER</span>
            <span style={teamDetailPrimaryStyle}>UX & User Journey • Medical UX</span>
            <span style={teamDetailSecondaryStyle}>Accessibility • Stress-tested Design</span>
          </div>

          {/* Mr. Nathaniel T.O, AMICDFA */}
          <div style={teamCardStyle} className="glass-panel">
            <div style={teamAvatarWrapper}>
              <img src="/assets/team/nathaniel.png" alt="Mr. Nathaniel T.O" style={teamAvatarStyle} />
            </div>
            <h4 style={teamNameStyle}>Mr. Nathaniel T.O, AMICDFA</h4>
            <span style={teamRoleStyle}>CYBERSECURITY LEAD</span>
            <span style={teamDetailPrimaryStyle}>Security Architecture</span>
            <span style={teamDetailSecondaryStyle}>Threat Mitigation • NDPA Compliance</span>
          </div>
        </div>
      </section>
    </div>
  );
}

// Inline Styles
const landingWrapperStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '100vh',
  background: 'var(--bg-base)',
  color: 'var(--text-primary)',
  display: 'flex',
  flexDirection: 'column',
  padding: '1.5rem',
  paddingTop: '6.5rem', /* Leaves space for the fixed navbar floating above */
  gap: '3rem',
  overflowX: 'hidden',
  transition: 'background-color 0.3s ease, color 0.3s ease',
};

const navStyle: React.CSSProperties = {
  position: 'fixed',
  top: '1.5rem',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 3rem)',
  maxWidth: '1200px',
  zIndex: 100,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.85rem 1.5rem',
};

const logoWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
};

const logoTextStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
  letterSpacing: '-0.03em',
  color: 'var(--text-primary)',
};

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.5rem',
};

const navLinkStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.2s ease',
};

const navActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const themeToggleBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '1.1rem',
  cursor: 'pointer',
};

const loginLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  cursor: 'pointer',
};

const btnGetStartedStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--coral-red)',
  border: 'none',
  borderRadius: '50px',
  color: '#fff',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
};

const heroSectionStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: '3rem',
  width: '100%',
  maxWidth: '1200px',
  margin: '2rem auto 0 auto',
  alignItems: 'center',
};

const heroLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: '2.5rem',
  fontWeight: 800,
  lineHeight: '1.15',
  letterSpacing: '-0.03em',
};

const highlightTextStyle: React.CSSProperties = {
  color: 'var(--coral-red)',
};

const heroSubTitleStyle: React.CSSProperties = {
  fontSize: '0.94rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
};

const heroActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
};

const heroBtnPrimaryStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: 'var(--coral-red)',
  border: 'none',
  borderRadius: '50px',
  color: '#fff',
  fontSize: '0.88rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const heroBtnSecondaryStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  background: 'none',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '50px',
  color: 'var(--text-primary)',
  fontSize: '0.88rem',
  fontWeight: 700,
  cursor: 'pointer',
};

const badgeContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1.25rem',
  marginTop: '1.25rem',
};

const appBadgeWrapper: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  paddingTop: '12px',
};

const badgeLabelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '0px',
  left: '12px',
  zIndex: 10,
  fontSize: '0.52rem',
  fontWeight: 800,
  color: '#fff',
  background: 'var(--coral-red)',
  padding: '2px 8px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
};

const heroRightStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '380px',
  height: '420px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
};

const heroPhoneLeftStyle: React.CSSProperties = {
  position: 'absolute',
  left: '10px',
  top: '45px',
  width: '200px',
  height: 'auto',
  zIndex: 1,
  filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.45))',
};

const heroPhoneRightStyle: React.CSSProperties = {
  position: 'absolute',
  right: '10px',
  top: '0px',
  width: '200px',
  height: 'auto',
  zIndex: 2,
  filter: 'drop-shadow(0 25px 35px rgba(0,0,0,0.55))',
};

const infoSectionStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1200px',
  margin: '2rem auto',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '1.85rem',
  fontWeight: 800,
  letterSpacing: '-0.02em',
};

const sectionSubTitleStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
};

const cardGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '1.5rem',
  marginTop: '2rem',
};

const stepCardStyle: React.CSSProperties = {
  padding: '2rem 1.5rem 1.5rem 1.5rem',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  textAlign: 'center',
};

const stepNumberStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  background: 'var(--coral-red)',
  color: '#fff',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontWeight: 800,
  fontSize: '0.78rem',
  position: 'absolute',
  top: '-14px',
  left: '50%',
  transform: 'translateX(-50%)',
  boxShadow: '0 4px 10px rgba(255, 59, 48, 0.3)',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '0.94rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.45',
};

const featuresSectionStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: '4rem',
  width: '100%',
  maxWidth: '1200px',
  margin: '2rem auto',
  alignItems: 'center',
};

const featuresLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const featureSubHeadingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 800,
};

const featureDescStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
};

const checkListStyle: React.CSSProperties = {
  listStyle: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const checkItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.82rem',
  fontWeight: 600,
};

const checkIconStyle: React.CSSProperties = {
  color: 'var(--coral-red)',
  fontWeight: 800,
};

const consultationsBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 59, 48, 0.02)',
  border: '1px solid rgba(255, 59, 48, 0.15)',
  borderRadius: '8px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  marginTop: '0.5rem',
};

const boxHeaderStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 800,
  color: 'var(--coral-red)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const boxRowStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.4',
};

const featuresRightStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const featuresPhoneStyle: React.CSSProperties = {
  width: '230px',
  height: 'auto',
  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))',
};

const testimonialCardStyle: React.CSSProperties = {
  padding: '1.75rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.75rem',
  textAlign: 'center',
};

const testimonialSubtitleStyle: React.CSSProperties = {
  fontSize: '0.68rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginTop: '-4px',
};

const securitySectionStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1200px',
  margin: '3rem auto',
  padding: '2.5rem',
  background: 'rgba(15, 22, 38, 0.4)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.03)',
};

const securityGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  gap: '3rem',
  alignItems: 'center',
  marginTop: '2rem',
};

const securityLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  textAlign: 'left',
};

const securitySubHeadingStyle: React.CSSProperties = {
  fontSize: '1.35rem',
  fontWeight: 800,
  color: '#fff',
};

const securityDescStyle: React.CSSProperties = {
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
  lineHeight: '1.55',
};

const securityRightStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const padlockWrapperStyle: React.CSSProperties = {
  padding: '2rem',
  background: 'rgba(255, 183, 3, 0.03)',
  borderRadius: '50%',
  border: '1px solid rgba(255, 183, 3, 0.1)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 20px 50px rgba(251, 133, 0, 0.05)',
  animation: 'float 6s infinite ease-in-out',
};

const teamSectionStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '1200px',
  margin: '3rem auto',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const teamContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '1.5rem',
  marginTop: '2rem',
};

const teamCardStyle: React.CSSProperties = {
  width: '320px',
  padding: '2rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  gap: '0.65rem',
};

const teamAvatarWrapper: React.CSSProperties = {
  width: '102px',
  height: '102px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--coral-red), #ff758c)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 8px 24px rgba(255, 59, 48, 0.25)',
  marginBottom: '0.5rem',
};

const teamAvatarStyle: React.CSSProperties = {
  width: '94px',
  height: '94px',
  borderRadius: '50%',
  border: '2px solid #080c14',
  objectFit: 'cover',
};

const teamNameStyle: React.CSSProperties = {
  fontSize: '0.96rem',
  fontWeight: 800,
  color: '#fff',
  margin: '0.25rem 0 0.1rem 0',
};

const teamRoleStyle: React.CSSProperties = {
  fontSize: '0.74rem',
  fontWeight: 800,
  color: 'var(--coral-red)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const teamDetailPrimaryStyle: React.CSSProperties = {
  fontSize: '0.76rem',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const teamDetailSecondaryStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-secondary)',
};
