import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Header from '../components/layout/SidebarLeft';
import MainContent from '../components/layout/MainContent';
import Footer from '../components/layout/Footer';
import { useAuth } from '@/hooks/UseAuth';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import Modal from '@/components/Modal';
import NavBar from '@/components/layout/NavBar';
import { useRouter } from 'next/router';
import { useTracks } from '@/hooks/UseTracks';
import DragAndDropWrapper from '@/components/layout/DragAndDropWrapper';

const HomePage: React.FC = () => {
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log("User in HomePage:", user);
  }, [user]);

  const handleRegistrationSuccess = () => {
    setRegistrationSuccess(true);
    setTimeout(() => {
      setRegistrationSuccess(false);
      setIsModalOpen(false); // Close modal
      router.push('/'); // Redirect after successful registration
    }, 2000);
  };

  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const closeModal = () => {
    setIsModalOpen(false);
    console.log("Closing modal directly.");
  };

  const openModalWithContent = (content: React.ReactNode) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

  const openRegistrationModal = () => {
    openModalWithContent(
      <RegisterForm onSuccess={handleRegistrationSuccess} onCloseModal={toggleModal} />
    );
  };

  // Updated to use the direct close function after successful login
  const openLoginModal = () => {
    openModalWithContent(
      <LoginForm onCloseModal={closeModal} />
    );
  };

  const navBarContent = user ? (
    <div>SoundHaven</div>
  ) : (
    <div>Welcome to SoundHaven! Log in to start your own library, comment on tracks, and create playlists.</div>
  );

  return (
    <div className='flex-col'>
      <NavBar
        onLoginClick={openLoginModal}
        onRegisterClick={openRegistrationModal}
      >
        {navBarContent}
      </NavBar>

      <div className="flex min-h-screen">
        <Head>
          <title>SoundHaven</title>
          <meta name="description" content="Discover and manage music with SoundHaven" />
        </Head>

        <Header />

        
        <DragAndDropWrapper />

        <MainContent error={error}/>
      </div>

      <Modal isOpen={isModalOpen} onClose={toggleModal}>
        {modalContent}
      </Modal>

      <Footer />
    </div>
  );
};

export default HomePage;
