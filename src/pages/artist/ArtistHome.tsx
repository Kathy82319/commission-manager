import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface ArtistProfile {
  display_name: string;
  avatar_url: string;
  bio: string;
  about_me: string;
  tos_content: string;
  portfolio_urls: string[];
  commission_process: string;
  payment_info: string;
  usage_rules: string;
  custom_1_title?: string;
  custom_1_content?: string;
  custom_2_title?: string;
  custom_2_content?: string;
  custom_3_title?: string;
  custom_3_content?: string;
}

export function ArtistHome() {
  const { artistId } = useParams(); // 抓取網址上的 ID
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/artist-profile/${artistId}`);
        const data = await res.json();
        if (data.success) {
          const parsedUrls = typeof data.data.portfolio_urls === 'string' 
            ? JSON.parse(data.data.portfolio_urls) 
            : (data.data.portfolio_urls || []);
          
          setProfile({ ...data.data, portfolio_urls: parsedUrls });
        }
      } catch (error) {
        console.error("讀取公開主頁失敗", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [artistId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
  if (!profile) return <div style={{ textAlign: 'center', padding: '50px' }}>找不到該繪師資料</div>;

  const sectionStyle = { marginBottom: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px' };
  const titleStyle = { borderLeft: '5px solid #333', paddingLeft: '15px', marginBottom: '20px', fontSize: '20px' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px', color: '#333', lineHeight: '1.8' }}>
      
      {/* 頂部個人資訊 */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div style={{ 
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 20px', 
          backgroundColor: '#eee', backgroundImage: `url(${profile.avatar_url})`, 
          backgroundSize: 'cover', backgroundPosition: 'center' 
        }} />
        <h1 style={{ margin: '0 0 10px 0' }}>{profile.display_name}</h1>
        <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto' }}>{profile.bio}</p>
      </div>

      {/* 詳細介紹 */}
      {profile.about_me && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>詳細介紹</h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>{profile.about_me}</div>
        </div>
      )}

      {/* 作品展示區 (格狀牆) */}
      {profile.portfolio_urls.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>作品展示</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {profile.portfolio_urls.map((url, index) => (
              <img key={index} src={url} alt="作品" style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', aspectRatio: '1/1' }} />
            ))}
          </div>
        </div>
      )}

      {/* 委託流程 */}
      {profile.commission_process && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>委託流程</h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>{profile.commission_process}</div>
        </div>
      )}

      {/* 付款方式 */}
      {profile.payment_info && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>付款方式</h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>{profile.payment_info}</div>
        </div>
      )}

      {/* 委託規範 */}
      {profile.usage_rules && (
        <div style={sectionStyle}>
          <h2 style={titleStyle}>委託規範</h2>
          <div style={{ whiteSpace: 'pre-wrap' }}>{profile.usage_rules}</div>
        </div>
      )}

      {/* 自訂項目 1~3 */}
      {[1, 2, 3].map(num => {
        const t = profile[`custom_${num}_title` as keyof ArtistProfile];
        const c = profile[`custom_${num}_content` as keyof ArtistProfile];
        if (!t || !c) return null;
        return (
          <div key={num} style={sectionStyle}>
            <h2 style={titleStyle}>{t as string}</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c as string}</div>
          </div>
        );
      })}

      {/* 條款內容 */}
      {profile.tos_content && (
        <div style={{ ...sectionStyle, backgroundColor: '#f9f9f9', fontSize: '14px' }}>
          <h2 style={titleStyle}>委託條款 (TOS)</h2>
          <div style={{ whiteSpace: 'pre-wrap', color: '#666' }}>{profile.tos_content}</div>
        </div>
      )}

    </div>
  );
}