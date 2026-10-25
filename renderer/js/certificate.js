/**
 * certificate.js — Generates a printable certificate inside #certificate.
 */

import { getProfile, getProfileRank } from './gameEngine.js';

/**
 * Render the certificate for the active profile.
 * @param {HTMLElement} certEl — the #certificate div
 */
export function renderCertificate(certEl) {
  const profile = getProfile();
  if (!profile) {
    certEl.innerHTML = '<p>No profile data found.</p>';
    return;
  }

  const rank = getProfileRank();
  const date = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  certEl.innerHTML = `
    <div class="cert-header">Certificate of Achievement</div>
    <div class="cert-title">🔍 IP Detectives</div>
    <div class="cert-subtitle">Intellectual Property Awareness Program</div>
    <div class="cert-name">${escapeHTML(profile.name)}</div>
    <div class="cert-body">
      has successfully completed all four zones of <strong>IP City</strong> —
      Patent Lab, Trademark Tower, Copyright Cinema, and Design Studio —
      demonstrating knowledge of Intellectual Property Rights under Indian law.
    </div>
    <div class="cert-rank">${rank.emoji} ${rank.title}</div>
    <div class="cert-score">Total Score: ${profile.totalPoints} points · ${profile.totalStars} stars</div>
    <div class="cert-date">${date}</div>
    <div class="cert-footer">CIPAM · Ministry of Commerce &amp; Industry, Government of India</div>
  `;
}

/** Print the certificate (opens the system print dialog). */
export function printCertificate() {
  window.print();
}

/** Simple HTML escaping to prevent injection. */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
