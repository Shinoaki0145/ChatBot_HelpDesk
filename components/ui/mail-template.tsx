import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import tailwindConfig from '@/tailwind.config';
import { Link2 } from 'lucide-react';

interface GroupInvitationEmailProps {
  UserName: string;
  GroupName: string
}

// const baseUrl = process.env.VERCEL_URL
//   ? `https://${process.env.VERCEL_URL}`
//   : '';

export const GroupInvitationEmail = ({
  UserName,
  GroupName
}: GroupInvitationEmailProps) => (
  <Html>
    <Head />
    <Tailwind config={tailwindConfig}>
      <Body className="bg-white font-koala">
        <Preview>
          The Intelligence ChatBot platform that helps you uncover qualified
          leads.
        </Preview>
        <Container className="mx-auto py-5 pb-12">
          <Img
            src={`https://www.eaton.com/content/dam/eaton/products/electrical-circuit-protection/fuses/paul-p-gubany-center/bus-ele-power-short-circuit-capacity2.png`}
            width="170"
            height="170"
            alt="logo"
            className="mx-auto"
          />
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '10vh' }}>
            <h1 className='text-4xl font-bold text-slate-900 leading-tight'> Group Invitation</h1>
          </div> 
          
          <Hr />
          <Text className="text-[16px] leading-[26px]">
            Hi {UserName},
          </Text>
          <Text className="text-[16px] leading-[26px]">
            You are invited to Group <strong>{GroupName}</strong>.
          </Text>
          <Section className="text-center">
            <Button
              className="bg-[#5F51E8] rounded-[3px] text-white text-[16px] no-underline text-center block p-3"
              href={`${process.env.DOMAIN}/account/groups`}
            >
              View Group
            </Button>
          </Section>
          <Text className="text-[16px] leading-[26px]">
            Best,
            <br />
            The ChatBot-HelpDesk team
          </Text>
          <Hr className="border-[#cccccc] my-5" />
          <Text className="text-[#8898aa] text-[12px]">
            © 2025 ChatBot-HelpDesk. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default GroupInvitationEmail;
