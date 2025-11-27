import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // 더미 이미지용
      },
      {
        protocol: 'https',
        hostname: 'ltn.gold-usergeneratedcontent.net', // Hitomi 원본 도메인 예시
      },
      {
        protocol: 'https',
        hostname: 'aa.gold-usergeneratedcontent.net', // Hitomi 원본 도메인 예시
      },
      // 로컬 서버나 다른 도메인 사용 시 여기에 추가
    ],
  },
};

export default nextConfig;