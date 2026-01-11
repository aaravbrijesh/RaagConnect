import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  className?: string;
}

const ADSENSE_CLIENT = 'ca-pub-8400431646684509';

export const AdSense = ({ 
  adSlot, 
  adFormat = 'auto', 
  fullWidthResponsive = true,
  className = '' 
}: AdSenseProps) => {
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive}
      />
    </div>
  );
};

// Pre-configured ad components for common placements
export const BannerAd = ({ adSlot, className }: { adSlot: string; className?: string }) => (
  <AdSense adSlot={adSlot} adFormat="horizontal" className={className} />
);

export const SidebarAd = ({ adSlot, className }: { adSlot: string; className?: string }) => (
  <AdSense adSlot={adSlot} adFormat="rectangle" className={className} />
);

export const InArticleAd = ({ adSlot, className }: { adSlot: string; className?: string }) => (
  <AdSense adSlot={adSlot} adFormat="auto" className={className} />
);
