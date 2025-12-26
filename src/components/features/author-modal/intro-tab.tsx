import { useState } from 'react'
import { Globe, Mail, Copy, Check } from 'lucide-react'

const AUTHOR_INFO = {
  name: 'Binh Vuong AI Marketing',
  website: 'https://binhvuong.vn',
  email: 'contact@binhvuong.vn',
}

const BANK_INFO = {
  bank: 'Techcombank',
  accountNumber: '0963738833',
  content: 'Mời Bình Vương Cafe',
  qrUrl: 'https://qr.sepay.vn/img?bank=Techcombank&acc=0963738833&template=compact&amount=&des=Moi+Binh+Vuong+Cafe',
}

/**
 * Introduction tab - Full author profile with all sections
 */
export function IntroTab() {
  const [copied, setCopied] = useState(false)
  const [qrError, setQrError] = useState(false)

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_INFO.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Logo + Name */}
      <div className="text-center">
        <img
          src={chrome.runtime.getURL('icons/icon-128.png')}
          alt="Logo"
          className="w-16 h-16 mx-auto mb-2"
        />
        <h3 className="font-semibold text-lg">{AUTHOR_INFO.name}</h3>
      </div>

      {/* About section */}
      <section>
        <h4 className="text-sm font-semibold mb-2 text-brand">Giới thiệu / About</h4>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Xin chào! Tôi là Bình Vương, một AI Marketing specialist. Extension này được phát triển để giúp bạn quản lý công việc hiệu quả hơn với khả năng đồng bộ Notion.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1.5 italic">
          Hello! I'm Binh Vuong, an AI Marketing specialist. This extension was developed to help you manage your work more efficiently with Notion sync capabilities.
        </p>
      </section>

      {/* Coffee invitation section */}
      <section>
        <h4 className="text-sm font-semibold mb-3 text-brand">Mời cà phê / Buy me a coffee</h4>
        <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
          {/* QR Code */}
          <div className="flex justify-center mb-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              {!qrError ? (
                <img
                  src={BANK_INFO.qrUrl}
                  alt="QR Mời cà phê"
                  className="w-32 h-32"
                  onError={() => setQrError(true)}
                />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
                  QR không khả dụng
                </div>
              )}
            </div>
          </div>

          {/* Bank details */}
          <div className="text-center text-sm space-y-1">
            <p>
              <span className="text-[var(--text-secondary)]">Ngân hàng:</span>{' '}
              <span className="font-medium">{BANK_INFO.bank}</span>
            </p>
            <p className="flex items-center justify-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Số TK:</span>{' '}
              <span className="font-medium font-mono">{BANK_INFO.accountNumber}</span>
              <button
                onClick={handleCopyAccount}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Sao chép"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 text-[var(--text-secondary)]" />
                )}
              </button>
            </p>
            <p>
              <span className="text-[var(--text-secondary)]">Nội dung:</span>{' '}
              <span className="font-medium">{BANK_INFO.content}</span>
            </p>
          </div>
        </div>
      </section>

      {/* Contact section */}
      <section>
        <h4 className="text-sm font-semibold mb-2 text-brand">Liên hệ / Contact</h4>
        <div className="space-y-2">
          <a
            href={AUTHOR_INFO.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-brand transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>binhvuong.vn</span>
          </a>
          <a
            href={`mailto:${AUTHOR_INFO.email}`}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-brand transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>{AUTHOR_INFO.email}</span>
          </a>
        </div>
      </section>

      {/* Request form hint */}
      <section className="text-center pt-2 border-t border-[var(--border-color)]">
        <p className="text-xs text-[var(--text-secondary)]">
          Có ý tưởng tính năng mới? Chuyển sang tab{' '}
          <span className="text-brand font-medium">Yêu cầu</span>{' '}
          để gửi cho tác giả.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] italic mt-0.5">
          Have a feature idea? Switch to the Request tab to send it to the author.
        </p>
      </section>
    </div>
  )
}
