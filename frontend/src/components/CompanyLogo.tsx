import React from 'react';

interface CompanyLogoProps {
  className?: string;
  imageClassName?: string;
}

const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className = '',
  imageClassName = 'h-9 w-auto max-w-[140px] object-contain',
}) => (
  <img src="/inno.jpg" alt="Innotronix" className={`${imageClassName} ${className}`.trim()} />
);

export default CompanyLogo;
