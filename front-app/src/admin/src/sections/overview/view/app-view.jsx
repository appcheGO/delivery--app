import { useEffect, useState } from "react";
import {
  getFirestore,
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  Container,
  Box,
  Typography,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { startOfDay, endOfDay } from "date-fns";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
//import CancelIcon from "@mui/icons-material/Cancel";
import HomeIcon from "@mui/icons-material/Home";
import LocalPrintshopRoundedIcon from "@mui/icons-material/LocalPrintshopRounded";
import Header from "../../../layouts/dashboard/header";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";


export default function AppView() {
  const firebaseConfig = {
    apiKey: "AIzaSyCtUEJucj4FgNrJgwLhcpzZ7OJVCqjM8ls",
    authDomain: "testeapp-666bc.firebaseapp.com",
    projectId: "testeapp-666bc",
    storageBucket: "testeapp-666bc.appspot.com",
    messagingSenderId: "273940847816",
    appId: "1:273940847816:web:7d5c1f136cb8cac3c159fd",
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const [modalAberto, setModalAberto] = useState(false);
  const [quantidadeDePedidosEntregue, setQuantidadeDePedidosEntregue] =
    useState([]);
  const [valorRecebidoEntrega, setValorRecebidoEntrega] = useState([]);
  const [pedidoEntregue, setPedidoEntregue] = useState([]);
  const [pedidoEmPreparo, setPedidoEmPreparo] = useState([]);
  const [pedidoFinalizado, setPedidoFinalizado] = useState([]);
  const [itensVisiveisPorPedido, setItensVisiveisPorPedido] = useState({});
  const [enderecoVisivelPorPedido, setEnderecoVisivelPorPedido] = useState({});
  const [listaDePedidos, setListaDePedidos] = useState([]);
 

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buscarPedidosRecebidos = async () => {
    try {
      const pedidosEntreguesRef = collection(
        db,
        "PEDIDOS ENTREGUES",
        "TELEFONE",
        "PEDIDOS"
      );
      const pedidosEntreguesSnapshot = await getDocs(pedidosEntreguesRef);
      const pedidosEntreguesData = pedidosEntreguesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const pedidosFinalizadosRef = collection(
        db,
        "PEDIDO FINALIZADO",
        "TELEFONE",
        "PEDIDOS"
      );
      const pedidosFinalizadosSnapshot = await getDocs(pedidosFinalizadosRef);
      const pedidosFinalizadosData = pedidosFinalizadosSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

      const idsPedidosFinalizadosExcluir = pedidosFinalizadosData
        .filter((pedidoFinalizado) =>
          pedidosEntreguesData.some(
            (pedidoEntregue) =>
              pedidoEntregue.numeroPedido === pedidoFinalizado.numeroPedido
          )
        )
        .map((pedidoFinalizado) => pedidoFinalizado.id);

      await Promise.all(
        idsPedidosFinalizadosExcluir.map(async (idPedidoFinalizado) => {
          const pedidoFinalizadoRef = doc(
            db,
            "PEDIDO FINALIZADO",
            "TELEFONE",
            "PEDIDOS",
            idPedidoFinalizado
          );
          await deleteDoc(pedidoFinalizadoRef);
        })
      );

      const pedidosRecebidosRef = collection(
        db,
        "PEDIDOS ENTREGUES",
        "TELEFONE",
        "PEDIDOS"
      );
      const querySnapshot = await getDocs(
        query(
          pedidosRecebidosRef,
          where("dataPedido", ">=", startOfDay(new Date())),
          where("dataPedido", "<=", endOfDay(new Date()))
        )
      );
      const pedidosRecebidos = [];
      querySnapshot.forEach((doc) => {
        const pedido = { id: doc.id, ...doc.data() };
        pedidosRecebidos.push(pedido);
      });
      const valores = pedidosRecebidos.flatMap((item) =>
        item.itens.map((item) => item.valorTotalDoProduto)
      );

      const somaDosValoresEntrega = valores
        .reduce((accumulator, currentValue) => accumulator + currentValue, 0)
        .toFixed(2);

      setValorRecebidoEntrega(somaDosValoresEntrega);
      setQuantidadeDePedidosEntregue(pedidosRecebidos.length);
      setPedidoEntregue(pedidosRecebidos);
      return pedidosRecebidos;
    } catch (error) {
      console.error("Erro ao buscar os pedidos recebidos:", error);
    }
  };

  const handleClick = () => {
    setModalAberto(true);
    buscarPedidosRecebidos();
  };
  const fetchPedidos = async () => {
    const ordersQuery = query(
      collection(db, "PEDIDOS RECEBIDOS", "TELEFONE", "PEDIDOS")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const pedidos = [];

      snapshot.forEach((doc) => {
        const orderData = doc.data();
        const orderNumber = doc.id;
        pedidos.push({
          numeroPedido: orderNumber,
          ...orderData,
        });
      });

      setListaDePedidos(pedidos);
    });

    return unsubscribe;
  };

  const prepararPedido = (pedido) => {
    moverParaPreparo(pedido);

    setPedidoEmPreparo([...pedidoEmPreparo, pedido]);
    try {
      const mensagemCliente = `Olá ${pedido.DadosPessoais.nome}, seu pedido foi aceito e está em preparo! 😍 Agradecemos pela preferência.`;

      sendWhatsappMessage(pedido.DadosPessoais.telefone, mensagemCliente);
    } catch (error) {
      console.error(
        "Erro ao preparar pedido ou enviar mensagem para o cliente:",
        error
      );
    }
  };
  const moverParaPreparo = async (pedido) => {
    try {
      const pedidosEmPreparoRef = collection(
        db,
        "PEDIDO EM PREPARO",
        "TELEFONE",
        "PEDIDOS"
      );

      await addDoc(pedidosEmPreparoRef, {
        ...pedido,
        numeroPedido: pedido.numeroPedido,
      });

      const pedidoOriginalRef = doc(
        db,
        "PEDIDOS RECEBIDOS",
        "TELEFONE",
        "PEDIDOS",
        pedido.numeroPedido
      );
      await deleteDoc(pedidoOriginalRef);

      setListaDePedidos((pedidos) => pedidos.filter((p) => p !== pedido));
    } catch (error) {
      console.error("Erro ao mover o pedido para preparo:", error);
    }
  };

  const moverParaPedidosFinalizados = async (pedidoFinalizado) => {
    try {
      const pedidosFinalizadosRef = collection(
        db,
        "PEDIDO FINALIZADO",
        "TELEFONE",
        "PEDIDOS"
      );

      const docRef = await addDoc(pedidosFinalizadosRef, {
        ...pedidoFinalizado,
        numeroPedido: pedidoFinalizado.numeroPedido,
      });

      setPedidoFinalizado((pedidos) => [
        ...pedidos,
        { ...pedidoFinalizado, id: docRef.id },
      ]);

      const pedidoEmPreparoRef = doc(
        db,
        "PEDIDO EM PREPARO",
        "TELEFONE",
        "PEDIDOS",
        pedidoFinalizado.numeroPedido
      );
      await deleteDoc(pedidoEmPreparoRef);
    } catch (error) {
      console.error("Erro ao mover o pedido finalizado:", error);
    }
  };

  const moverParaPedidosEntregues = async (pedidoFinalizado) => {
    try {
      const numeroPedido = pedidoFinalizado.numeroPedido;

      const pedidoEmPreparoRef = collection(
        db,
        "PEDIDO EM PREPARO",
        "TELEFONE",
        "PEDIDOS"
      );
      const pedidoEmPreparoQuery = query(
        pedidoEmPreparoRef,
        where("numeroPedido", "==", numeroPedido)
      );
      const pedidoEmPreparoSnapshot = await getDocs(pedidoEmPreparoQuery);

      if (!pedidoEmPreparoSnapshot.empty) {
        const pedidoEmPreparoDoc = pedidoEmPreparoSnapshot.docs[0];
        await deleteDoc(pedidoEmPreparoDoc.ref);
      }

      const pedidosEntreguesRef = collection(
        db,
        "PEDIDOS ENTREGUES",
        "TELEFONE",
        "PEDIDOS"
      );

      const docRef = await addDoc(pedidosEntreguesRef, {
        ...pedidoFinalizado,
        numeroPedido: numeroPedido,
      });

      setPedidoEntregue((pedidos) => [
        ...pedidos,
        { ...pedidoFinalizado, id: docRef.id },
      ]);

      const pedidoFinalizadoRef = doc(
        db,
        "PEDIDO FINALIZADO",
        "TELEFONE",
        "PEDIDOS",
        pedidoFinalizado.id
      );
      await deleteDoc(pedidoFinalizadoRef);

      buscarPedidosRecebidos();
      const numeroTelefone = pedidoFinalizado.DadosPessoais.telefone;
      const mensagem = encodeURIComponent(
        `${pedidoFinalizado.DadosPessoais.nome}, vim trazer a melhor notícia do dia, seu pedido saiu para a entrega! 🏍️`
      );
      const linkWhatsapp = `https://api.whatsapp.com/send?phone=55${numeroTelefone}&text=${mensagem}`;

      window.open(linkWhatsapp, "_blank");
    } catch (error) {
      console.error("Erro ao mover o pedido para entregues:", error);
    }
  };
  const buscarPedidosEmPreparo = async () => {
    try {
      const pedidosEmPreparoRef = collection(
        db,
        "PEDIDO EM PREPARO",
        "TELEFONE",
        "PEDIDOS"
      );
      const pedidosEmPreparoSnapshot = await getDocs(pedidosEmPreparoRef);
      const pedidosEmPreparoData = pedidosEmPreparoSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const pedidosFinalizadosRef = collection(
        db,
        "PEDIDO FINALIZADO",
        "TELEFONE",
        "PEDIDOS"
      );
      const pedidosFinalizadosSnapshot = await getDocs(pedidosFinalizadosRef);
      const pedidosFinalizadosData = pedidosFinalizadosSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

      const idsPedidosEmPreparoExcluir = pedidosEmPreparoData
        .filter((pedidoEmPreparo) =>
          pedidosFinalizadosData.some(
            (pedidoFinalizado) =>
              pedidoFinalizado.numeroPedido === pedidoEmPreparo.numeroPedido
          )
        )
        .map((pedidoEmPreparo) => pedidoEmPreparo.id);

      await Promise.all(
        idsPedidosEmPreparoExcluir.map(async (idPedidoEmPreparo) => {
          const pedidoEmPreparoRef = doc(
            db,
            "PEDIDO EM PREPARO",
            "TELEFONE",
            "PEDIDOS",
            idPedidoEmPreparo
          );
          await deleteDoc(pedidoEmPreparoRef);
        })
      );

      const pedidosEmPreparoFiltrados = pedidosEmPreparoData.filter(
        (pedidoEmPreparo) =>
          !pedidosFinalizadosData.some(
            (pedidoFinalizado) =>
              pedidoFinalizado.numeroPedido === pedidoEmPreparo.numeroPedido
          )
      );

      console.log("numero do pedido", pedidosEmPreparoFiltrados);
      setPedidoEmPreparo(pedidosEmPreparoFiltrados);
    } catch (error) {
      console.error("Erro ao buscar pedidos em preparo:", error);
    }
  };

  const buscarPedidosFinalizado = async () => {
    try {
      const pedidosFinalizadoRef = collection(
        db,
        "PEDIDO FINALIZADO",
        "TELEFONE",
        "PEDIDOS"
      );
      const querySnapshot = await getDocs(pedidosFinalizadoRef);
      const pedidosFinalizadoData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      await Promise.all(
        pedidosFinalizadoData.map(async (pedidoFinalizado) => {
          const pedidosEntreguesRef = collection(
            db,
            "PEDIDOS ENTREGUES",
            "TELEFONE",
            "PEDIDOS"
          );
          const pedidosEntreguesQuery = query(
            pedidosEntreguesRef,
            where("numeroPedido", "==", pedidoFinalizado.numeroPedido)
          );
          const pedidosEntreguesSnapshot = await getDocs(pedidosEntreguesQuery);

          if (!pedidosEntreguesSnapshot.empty) {
            const pedidoFinalizadoRef = doc(
              db,
              "PEDIDO FINALIZADO",
              "TELEFONE",
              "PEDIDOS",
              pedidoFinalizado.id
            );
            await deleteDoc(pedidoFinalizadoRef);
          }
        })
      );

      setPedidoFinalizado(pedidosFinalizadoData);
    } catch (error) {
      console.error("Erro ao buscar pedidos finalizados:", error);
    }
  };

  const pedidoPronto = async () => {
    try {
      if (pedidoEmPreparo.length > 0) {
        const pedidoFinal = pedidoEmPreparo[0];

        await moverParaPedidosFinalizados(pedidoFinal);

        setPedidoEmPreparo((pedidosEmPreparo) => pedidosEmPreparo.slice(1));
      }
    } catch (error) {
      console.error("Erro ao processar pedido pronto:", error);
    }
  };

  const toggleEnderecoVisivel = (numeroPedido) => {
    setEnderecoVisivelPorPedido((prevEnderecoVisivel) => ({
      ...prevEnderecoVisivel,
      [numeroPedido]: !prevEnderecoVisivel[numeroPedido],
    }));
  };

  const fecharModal = () => {
    setModalAberto(false);
  };
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "PEDIDOS ENTREGUES", "TELEFONE", "PEDIDOS"),
      (snapshot) => {
        const pedidosEntreguesData = snapshot.docs.map((doc) => doc.data());

        const pedidosExcluir = listaDePedidos.filter((pedido) =>
          pedidosEntreguesData.some(
            (pedidoEntregue) =>
              pedidoEntregue.numeroPedido === pedido.numeroPedido
          )
        );

        pedidosExcluir.forEach(async (pedido) => {
          const pedidoEmPreparoRef = collection(
            db,
            "PEDIDO EM PREPARO",
            "TELEFONE",
            "PEDIDOS"
          );
          const pedidoEmPreparoQuery = query(
            pedidoEmPreparoRef,
            where("numeroPedido", "==", pedido.numeroPedido)
          );
          const pedidoEmPreparoSnapshot = await getDocs(pedidoEmPreparoQuery);

          pedidoEmPreparoSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });

          const pedidoFinalizadoRef = collection(
            db,
            "PEDIDO FINALIZADO",
            "TELEFONE",
            "PEDIDOS"
          );
          const pedidoFinalizadoQuery = query(
            pedidoFinalizadoRef,
            where("numeroPedido", "==", pedido.numeroPedido)
          );
          const pedidoFinalizadoSnapshot = await getDocs(pedidoFinalizadoQuery);

          pedidoFinalizadoSnapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
        });
      }
    );

    return () => unsubscribe();
  }, [listaDePedidos, db]);

  useEffect(() => {
    fetchPedidos();
    buscarPedidosRecebidos();
    buscarPedidosEmPreparo();
    buscarPedidosFinalizado();
  }, []);
  const calcularSomaTotal = (itens) => {
    return itens.reduce((total, item) => total + item.valorTotalDoProduto, 0);
  };
  const corPorFormaDeEntrega = {
    Entrega: "#5c6bc0",
    Retirada: "#26a69a",
  };
  const corPorFormaDePagamento = {
    Credito: "#8d6e63",
    Debito: "#ff3d00",
    Pix: "#ffa726",
    Dinheiro: "#66bb6a",
  };
  const sendWhatsappMessage = (telefone, mensagem) => {
    const numeroLimpo = telefone.replace(/\D/g, "");
    const linkWhatsapp = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(
      mensagem
    )}`;

    window.open(linkWhatsapp, "_blank");
  };
  const imprimirPedido = (pedido) => {
    const conteudoPedido = formatarDadosPedido(pedido);

    const janelaImpressao = window.open("", "_blank");
    janelaImpressao.document.write(conteudoPedido);
    janelaImpressao.document.close();
    janelaImpressao.print();
  };

  const formatarDadosItem = (item) => {
    let conteudo = `
      Item: ${item.sabor}<br/>
      Quantidade: ${item.quantidade}`;

    if (item.refrigeranteDoCombo) {
      conteudo += `<br/>Refrigerante do Combo: ${item.refrigeranteDoCombo}`;
    }

    if (item.opcionalSelecionado) {
      conteudo += `<br/>Opcional: ${item.opcionalSelecionado}`;
    }

    if (item.adicionais.length > 0) {
      conteudo += `<br/>Adicionais:<br/> ${item.adicionais
        .map((adicional) => `${adicional.name} - (${adicional.qtde}x)`)
        .join("<br/>")}`;
    }

    if (item.observacao) {
      conteudo += `<br/>Observação: ${item.observacao}`;
    }

    conteudo += `<br/>---------------------------------------<br/>`;

    return conteudo;
  };
  const formatarDadosPedido = (pedido) => {
    const {
      numeroPedido,
      DadosPessoais: { nome, telefone },
      itens,
    } = pedido;

    const conteudoFormatado = `
      <style>
        @media print {
          body {
            font-family: Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
  
          .imprimir-conteudo {
            margin: 1cm;
          }
  
          .no-print {
            display: none;
          }
        }
      </style>
  
      <div class="imprimir-conteudo">
        Cliente: ${nome}<br/>
        Telefone: ${telefone}<br/>
       ---------------------------------------<br/>
        Pedido: ${numeroPedido}<br/>
        ---------------------------------------<br/>
        ${itens.map(formatarDadosItem).join("")}<br/>
     
      </div>
      
      <button class="no-print" onclick="window.print()">Imprimir</button>
    `;

    return conteudoFormatado;
  };

  return (
    <Container
      sx={{
        height: "100dvh",
        width: "100dvw",
        overflow: "auto",
        margin: 0,
      }}
    >
      <Header />
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          position: "relative",
          top: "6rem",
          gap: "0.8rem",
        }}
      >
        <Box
          className="box-shadow"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignItems: "center",
            backgroundColor: "#F8F8F8",
            padding: "1rem",
            border: "1px  solid",
            borderRadius: "8px",
            flexGrow: 1,
          }}
        >
          <Typography variant="h6">Quantidade de pedidos hoje:</Typography>
          <Typography variant="h3">{quantidadeDePedidosEntregue}</Typography>
          <VisibilityIcon
            titleAccess="Ver quantidades de pedidos de hoje"
            className="click"
            sx={{ pointerEvents: "pointer" }}
            onClick={handleClick}
          />

          <Dialog open={modalAberto} onClose={fecharModal}>
            <DialogContent sx={{ padding: 0 }}>
              <Box
                sx={{
                  backgroundColor: "transparent",
                  flex: 1,
                  minWidth: "300px",
                  maxHeight: "30rem",
                  overflow: "auto",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    backgroundColor: "green",
                    borderRadius: "15px",
                    mt: 1,
                  }}
                >
                  Pedidos Entregues
                </Typography>
                {pedidoEntregue.map((pedidoEntregue, index) => (
                  <Box
                    className="box-shadow"
                    key={index}
                    sx={{
                      mt: 1,
                      border: "1px  solid #333",
                      borderRadius: "15px",
                      margin: "0.8rem",
                      overflow: "hidden",
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyItems: "center",
                          width: "100%",
                          height: "2rem",
                          gap: "1rem",
                          pl: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              corPorFormaDeEntrega[
                                pedidoEntregue.DadosPessoais.formaDeEntrega
                              ],
                            borderRadius: "15px",
                            width: "5rem",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: "white" }}>
                            {pedidoEntregue.DadosPessoais.formaDeEntrega}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              corPorFormaDePagamento[
                                pedidoEntregue.DadosPessoais.formaDePagamento
                              ],
                            borderRadius: "15px",
                            width: "5rem",
                          }}
                        >
                          <Typography variant="body2" sx={{ color: "white" }}>
                            {pedidoEntregue.DadosPessoais.formaDePagamento}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ pl: 1, pt: 1 }}>
                        <b>Nome :</b> {pedidoEntregue.DadosPessoais.nome}
                        <br />
                        <b>Telefone :</b>{" "}
                        {pedidoEntregue.DadosPessoais.telefone}
                        <br />
                        <b>Pedido :</b> {pedidoEntregue.numeroPedido}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          justifyContent: "space-around",
                          height: "3rem",
                          gap: "1rem",
                        }}
                      >
                        {pedidoEntregue.itens.length > 0 && (
                          <>
                            <FormatListBulletedRoundedIcon
                              titleAccess="Itens do pedido"
                              className="click"
                              sx={{
                                cursor: "pointer",
                                color: "blue",
                                "&:hover": {
                                  backgroundColor: "transparent",
                                },
                              }}
                              onClick={() =>
                                setItensVisiveisPorPedido(
                                  (prevItensVisiveis) => ({
                                    ...prevItensVisiveis,
                                    [pedidoEntregue.numeroPedido]:
                                      prevItensVisiveis[
                                        pedidoEntregue.numeroPedido
                                      ]
                                        ? null
                                        : pedidoEntregue.itens,
                                  })
                                )
                              }
                            />

                            {pedidoEntregue.DadosPessoais.formaDeEntrega ==
                            "Retirada" ? (
                              console.log(
                                "nao e pra mostrar o endereco pois e retirada"
                              )
                            ) : (
                              <HomeIcon
                                titleAccess="Endereço do cliente"
                                className="click"
                                sx={{
                                  cursor: "pointer",
                                  color: "purple",
                                  "&:hover": {
                                    backgroundColor: "transparent",
                                  },
                                }}
                                onClick={() =>
                                  toggleEnderecoVisivel(
                                    pedidoEntregue.numeroPedido
                                  )
                                }
                              />
                            )}
                          </>
                        )}
                      </Box>

                      {itensVisiveisPorPedido[pedidoEntregue.numeroPedido] === pedidoEntregue.itens &&
                pedidoEntregue.itens.length > 0 && (
                  <Box>
                    {pedidoEntregue.DadosPessoais &&
                      pedidoEntregue.itens.map((item, itemIndex) => (
                        <Typography
                          key={itemIndex}
                          style={{
                            paddingLeft: "8px",
                            borderTop: "1px solid black",
                          }}
                        >
                          <b>Item:</b> {item.sabor}
                          <br />
                          <b>Quantidade:</b> {item.quantidade}
                          <br />
                          {item.valorOpcional === 0 ||
                          item.valorOpcional === "0" ||
                          item.valorOpcional === "" ? (
                            <>
                              <b>Opcional:</b>
                              {item.opcionalSelecionado}
                              <br />
                              <b>Valor opcional:</b>Grátis
                            </>
                          ) : (
                            <>
                              {item.opcionais == 0 ? (
                                console.log("escolheu bebida")
                              ) : (
                                <>
                                  {" "}
                                  <b>Opcional:</b>
                                  {item.opcionalSelecionado}
                                  <br />
                                  <b>Valor opcional:</b>
                                  R$ {item.valorOpcional}
                                </>
                              )}
                            </>
                          )}
                          {item.observacao === "" ? (
                            console.log("nao tem observacao")
                          ) : (
                            <>
                              <br />
                              <b>Observação:</b>
                              {item.observacao}
                            </>
                          )}
                          {item.opcionais == 0 ? (
                            console.log("nao precisa de espaco se forbebida")
                          ) : (
                            <br />
                          )}
                          {item.adicionais.length === 0 ? (
                            console.log("não tem adicionais")
                          ) : (
                            <>
                              <b>Adicionais:</b>
                              <br />
                              {item.adicionais.map((adicional, index) => (
                                <div key={index}>
                                  <p>
                                    {adicional.name}-({adicional.qtde}x)
                                  </p>
                                </div>
                              ))}
                              <b>Valor Total de adicionais</b>: R${" "}
                              {item.valorTotalAdicionais.toFixed(2)}
                              <br />
                            </>
                          )}
                          <b>Valor Do Item:</b> R$ {item.valorTotalDoProduto}
                          <br />
                        </Typography>
                      ))}
                    <Typography
                      style={{
                        backgroundColor: "green",
                        paddingLeft: "8px",
                        borderTop: "1px solid black",
                        color: "white",
                      }}
                    >
                      Valor Total do pedido: R${" "}
                      {calcularSomaTotal(pedidoEntregue.itens).toFixed(2)}
                    </Typography>
                    {pedidoEntregue.DadosPessoais.troco === 0 ||
                    pedidoEntregue.DadosPessoais.troco === null ||
                    pedidoEntregue.DadosPessoais.troco === undefined ||
                    pedidoEntregue.DadosPessoais.troco === "0" ? (
                      console.log("nao precisou de troco/ta trocado")
                    ) : (
                      <Typography
                        style={{
                          backgroundColor: "blue",
                          paddingLeft: "8px",
                          borderTop: "1px solid black",
                          color: "white",
                        }}
                      >
                        Troco para:{pedidoEntregue.DadosPessoais.troco}
                      </Typography>
                    )}
                  </Box>
                )}

              {enderecoVisivelPorPedido[pedidoEntregue.numeroPedido] && (
                <Typography
                  style={{
                    paddingLeft: "8px",
                    borderTop: "1px solid black",
                  }}
                >
                  <b>Endereço :</b>
                  <br />
                  Rua: {pedidoEntregue.DadosPessoais.endereco.rua}
                  <br />
                  Bairro: {pedidoEntregue.DadosPessoais.endereco.bairro}
                  <br />
                  Casa/Apto: {pedidoEntregue.DadosPessoais.endereco.casaApto}
                  <br />
                  CEP: {pedidoEntregue.DadosPessoais.endereco.cep}
                  <br />
                  Cidade: {pedidoEntregue.DadosPessoais.endereco.cidade}
                  <br />
                  Complemento: {pedidoEntregue.DadosPessoais.endereco.complemento}
                  <br />
                  Estado: {pedidoEntregue.DadosPessoais.endereco.estado}
                </Typography>
              )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={fecharModal} color="primary">
                Fechar
              </Button>
            </DialogActions>
          </Dialog>
        </Box>

        <Box
          className="box-shadow"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignItems: "center",
            backgroundColor: "#F8F8F8",
            padding: "1rem",
            border: "1px solid",
            flexGrow: 1,
            borderRadius: "8px",
          }}
        >
          <Typography variant="h6">Pedidos cancelados hoje:</Typography>
          <Typography variant="h3">0</Typography>
          <VisibilityIcon
            titleAccess="Ver quantidades de pedidos cancelados de hoje"
            sx={{ pointerEvents: "pointer", visibility: "hidden" }}
          />
        </Box>

        <Box
          className="box-shadow"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignItems: "center",
            backgroundColor: "#F8F8F8",
            padding: "1rem",
            border: "1px solid",
            flexGrow: 1,
            borderRadius: "8px",
          }}
        >
          <Typography variant="h6">Recebido hoje:</Typography>
          <Typography variant="h3">R$ {valorRecebidoEntrega}</Typography>
          <VisibilityIcon
            titleAccess="Ver valor recebido hoje"
            sx={{ pointerEvents: "pointer", visibility: "hidden" }}
          />
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "center",
          flexWrap: "wrap",
          position: "relative",
          top: "6rem",
          gap: "1rem",
          mt: 5,
        }}
      >
        <Box
          sx={{
            backgroundColor: "transparent",
            flex: 1,
            minWidth: "300px",
            maxHeight: "30rem",
            overflow: "auto",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              backgroundColor: "green",
              borderRadius: "8px",
              mt: 1,
            }}
          >
            Pedidos Recebidos
          </Typography>

          {listaDePedidos.map((pedido, index) => (
            <Box
              key={index}
              sx={{
                mt: 1,
                border: "1px  solid #333",
                borderRadius: "15px",
                margin: "0.8rem",
                overflow: "hidden",
                boxShadow: "2px 0px 10px 1px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyItems: "center",
                  width: "100%",
                  height: "2rem",
                  gap: "1rem",
                  pl: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDeEntrega[pedido.DadosPessoais.formaDeEntrega],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedido.DadosPessoais.formaDeEntrega}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDePagamento[
                        pedido.DadosPessoais.formaDePagamento
                      ],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedido.DadosPessoais.formaDePagamento}
                  </Typography>
                </Box>
                <LocalPrintshopRoundedIcon
                  titleAccess="Imprimir pedido"
                  sx={{ cursor: "pointer" }}
                  variant="outlined"
                  onClick={() => imprimirPedido(pedido)}
                />
              </Box>
              <Typography sx={{ pl: 1, pt: 1 }}>
                <b>Nome :</b> {pedido.DadosPessoais.nome}
                <br />
                <b>Telefone :</b> {pedido.DadosPessoais.telefone}
                <br />
                <b>Pedido :</b> {pedido.numeroPedido}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-around",
                  height: "3rem",
                  gap: "1rem",
                }}
              >
                {pedido.itens.length > 0 && (
                  <>
                    <CheckCircleIcon
                      titleAccess="aceitar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "green",
                        borderRadius: "7px",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() => prepararPedido(pedido)}
                    />

                    {/*<CancelIcon
                      titleAccess="negar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "red",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                    />*/}

                    <FormatListBulletedRoundedIcon
                      titleAccess="Itens do pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "blue",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() =>
                        setItensVisiveisPorPedido((prevItensVisiveis) => ({
                          ...prevItensVisiveis,
                          [pedido.numeroPedido]: prevItensVisiveis[
                            pedido.numeroPedido
                          ]
                            ? null
                            : pedido.itens,
                        }))
                      }
                    />
                    {pedido.DadosPessoais.formaDeEntrega == "Retirada" ? (
                      console.log(
                        "nao e pra mostrar o endereco pois e retirada"
                      )
                    ) : (
                      <HomeIcon
                        titleAccess="Endereço do cliente"
                        className="click"
                        sx={{
                          cursor: "pointer",
                          color: "purple",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                        onClick={() =>
                          toggleEnderecoVisivel(pedido.numeroPedido)
                        }
                      />
                    )}
                  </>
                )}
              </Box>

              {itensVisiveisPorPedido[pedido.numeroPedido] === pedido.itens &&
                pedido.itens.length > 0 && (
                  <Box>
                    {pedido.DadosPessoais &&
                      pedido.itens.map((item, itemIndex) => (
                        <Typography
                          key={itemIndex}
                          style={{
                            paddingLeft: "8px",
                            borderTop: "1px solid black",
                          }}
                        >
                          <b>Item:</b> {item.sabor}
                          <br />
                          <b>Quantidade:</b> {item.quantidade}
                          <br />
                          {item.valorOpcional === 0 ||
                          item.valorOpcional === "0" ||
                          item.valorOpcional === "" ? (
                            <>
                              <b>Opcional:</b>
                              {item.opcionalSelecionado}
                              <br />
                              <b>Valor opcional:</b>Grátis
                            </>
                          ) : (
                            <>
                              {item.opcionais == 0 ? (
                                console.log("escolheu bebida")
                              ) : (
                                <>
                                  {" "}
                                  <b>Opcional:</b>
                                  {item.opcionalSelecionado}
                                  <br />
                                  <b>Valor opcional:</b>
                                  R$ {item.valorOpcional}
                                </>
                              )}
                            </>
                          )}
                          {item.observacao === "" ? (
                            console.log("nao tem observacao")
                          ) : (
                            <>
                              <br />
                              <b>Observação:</b>
                              {item.observacao}
                            </>
                          )}
                          {item.opcionais == 0 ? (
                            console.log("nao precisa de espaco se forbebida")
                          ) : (
                            <br />
                          )}
                          {item.adicionais.length === 0 ? (
                            console.log("não tem adicionais")
                          ) : (
                            <>
                              <b>Adicionais:</b>
                              <br />
                              {item.adicionais.map((adicional, index) => (
                                <div key={index}>
                                  <p>
                                    {adicional.name}-({adicional.qtde}x)
                                  </p>
                                </div>
                              ))}
                              <b>Valor Total de adicionais</b>: R${" "}
                              {item.valorTotalAdicionais.toFixed(2)}
                              <br />
                            </>
                          )}
                          <b>Valor Do Item:</b> R$ {item.valorTotalDoProduto}
                          <br />
                        </Typography>
                      ))}
                    <Typography
                      style={{
                        backgroundColor: "green",
                        paddingLeft: "8px",
                        borderTop: "1px solid black",
                        color: "white",
                      }}
                    >
                      Valor Total do pedido: R${" "}
                      {calcularSomaTotal(pedido.itens).toFixed(2)}
                    </Typography>
                    {pedido.DadosPessoais.troco === 0 ||
                    pedido.DadosPessoais.troco === null ||
                    pedido.DadosPessoais.troco === undefined ||
                    pedido.DadosPessoais.troco === "0" ? (
                      console.log("nao precisou de troco/ta trocado")
                    ) : (
                      <Typography
                        style={{
                          backgroundColor: "blue",
                          paddingLeft: "8px",
                          borderTop: "1px solid black",
                          color: "white",
                        }}
                      >
                        Troco para:{pedido.DadosPessoais.troco}
                      </Typography>
                    )}
                  </Box>
                )}

              {enderecoVisivelPorPedido[pedido.numeroPedido] && (
                <Typography
                  style={{
                    paddingLeft: "8px",
                    borderTop: "1px solid black",
                  }}
                >
                  <b>Endereço :</b>
                  <br />
                  Rua: {pedido.DadosPessoais.endereco.rua}
                  <br />
                  Bairro: {pedido.DadosPessoais.endereco.bairro}
                  <br />
                  Casa/Apto: {pedido.DadosPessoais.endereco.casaApto}
                  <br />
                  CEP: {pedido.DadosPessoais.endereco.cep}
                  <br />
                  Cidade: {pedido.DadosPessoais.endereco.cidade}
                  <br />
                  Complemento: {pedido.DadosPessoais.endereco.complemento}
                  <br />
                  Estado: {pedido.DadosPessoais.endereco.estado}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            backgroundColor: "transparent",
            flex: 1,
            minWidth: "300px",
            maxHeight: "30rem",
            overflow: "auto",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              backgroundColor: "gray",
              borderRadius: "8px",
              mt: 1,
            }}
          >
            Pedidos Em Preparo
          </Typography>

          {pedidoEmPreparo.map((pedidoEmPreparo, index) => (
            <Box
              key={index}
              sx={{
                mt: 1,
                border: "1px  solid #333",
                borderRadius: "15px",
                margin: "0.8rem",
                overflow: "hidden",
                boxShadow: "2px 0px 10px 1px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyItems: "center",
                  width: "100%",
                  height: "2rem",
                  gap: "1rem",
                  pl: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDeEntrega[
                        pedidoEmPreparo.DadosPessoais.formaDeEntrega
                      ],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedidoEmPreparo.DadosPessoais.formaDeEntrega}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDePagamento[
                        pedidoEmPreparo.DadosPessoais.formaDePagamento
                      ],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedidoEmPreparo.DadosPessoais.formaDePagamento}
                  </Typography>
                </Box>
                <LocalPrintshopRoundedIcon
                  titleAccess="Imprimir pedido"
                  sx={{ cursor: "pointer" }}
                  variant="outlined"
                  onClick={() => imprimirPedido(pedidoEmPreparo)}
                />
              </Box>
              <Typography sx={{ pl: 1, pt: 1 }}>
                <b>Nome :</b> {pedidoEmPreparo.DadosPessoais.nome}
                <br />
                <b>Telefone :</b> {pedidoEmPreparo.DadosPessoais.telefone}
                <br />
                <b>Pedido :</b> {pedidoEmPreparo.numeroPedido}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-around",
                  height: "3rem",
                  gap: "1rem",
                }}
              >
                {pedidoEmPreparo.itens.length > 0 && (
                  <>
                    <CheckCircleIcon
                      titleAccess="Finalizar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "green",
                        borderRadius: "7px",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() => pedidoPronto(pedidoEmPreparo)}
                    />

                    {/*<CancelIcon
                      titleAccess="negar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "red",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                    />*/}

                    <FormatListBulletedRoundedIcon
                      titleAccess="Itens do pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "blue",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() =>
                        setItensVisiveisPorPedido((prevItensVisiveis) => ({
                          ...prevItensVisiveis,
                          [pedidoEmPreparo.numeroPedido]: prevItensVisiveis[
                            pedidoEmPreparo.numeroPedido
                          ]
                            ? null
                            : pedidoEmPreparo.itens,
                        }))
                      }
                    />

                    {pedidoEmPreparo.DadosPessoais.formaDeEntrega ==
                    "Retirada" ? (
                      console.log(
                        "nao e pra mostrar o endereco pois e retirada"
                      )
                    ) : (
                      <HomeIcon
                        titleAccess="Endereço do cliente"
                        className="click"
                        sx={{
                          cursor: "pointer",
                          color: "purple",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                        onClick={() =>
                          toggleEnderecoVisivel(pedidoEmPreparo.numeroPedido)
                        }
                      />
                    )}
                  </>
                )}
              </Box>

              {itensVisiveisPorPedido[pedidoEmPreparo.numeroPedido] ===
                pedidoEmPreparo.itens &&
                pedidoEmPreparo.itens.length > 0 && (
                  <Box>
                    {pedidoEmPreparo.DadosPessoais &&
                      pedidoEmPreparo.itens.map((item, itemIndex) => (
                        <Typography
                          key={itemIndex}
                          style={{
                            paddingLeft: "8px",
                            borderTop: "1px solid black",
                          }}
                        >
                          <b>Item:</b> {item.sabor}
                          <br />
                          <b>Quantidade:</b> {item.quantidade}
                          <br />
                          {item.valorOpcional === 0 ||
                          item.valorOpcional === "0" ||
                          item.valorOpcional === "" ? (
                            <>
                              <b>Opcional:</b>
                              {item.opcionalSelecionado}
                              <br />
                              <b>Valor opcional:</b>Grátis
                            </>
                          ) : (
                            <>
                              {item.opcionais == 0 ? (
                                console.log("escolheu bebida")
                              ) : (
                                <>
                                  {" "}
                                  <b>Opcional:</b>
                                  {item.opcionalSelecionado}
                                  <br />
                                  <b>Valor opcional:</b>
                                  R$ {item.valorOpcional}
                                </>
                              )}
                            </>
                          )}
                          {item.observacao === "" ? (
                            console.log("nao tem observacao")
                          ) : (
                            <>
                              <br />
                              <b>Observação:</b>
                              {item.observacao}
                            </>
                          )}
                          {item.opcionais == 0 ? (
                            console.log("nao precisa de espaco se forbebida")
                          ) : (
                            <br />
                          )}
                          {item.adicionais.length === 0 ? (
                            console.log("não tem adicionais")
                          ) : (
                            <>
                              <b>Adicionais:</b>
                              <br />
                              {item.adicionais.map((adicional, index) => (
                                <div key={index}>
                                  <p>
                                    {adicional.name}-({adicional.qtde}x)
                                  </p>
                                </div>
                              ))}
                              <b>Valor Total de adicionais</b>: R${" "}
                              {item.valorTotalAdicionais.toFixed(2)}
                              <br />
                            </>
                          )}
                          <b>Valor Do Item:</b> R$ {item.valorTotalDoProduto}
                          <br />
                        </Typography>
                      ))}
                    <Typography
                      style={{
                        backgroundColor: "green",
                        paddingLeft: "8px",
                        borderTop: "1px solid black",
                        color: "white",
                      }}
                    >
                      Valor Total do pedido: R${" "}
                      {calcularSomaTotal(pedidoEmPreparo.itens).toFixed(2)}
                    </Typography>
                    {pedidoEmPreparo.DadosPessoais.troco === 0 ||
                    pedidoEmPreparo.DadosPessoais.troco === null ||
                    pedidoEmPreparo.DadosPessoais.troco === undefined ||
                    pedidoEmPreparo.DadosPessoais.troco === "0" ? (
                      console.log("nao precisou de troco/ta trocado")
                    ) : (
                      <Typography
                        style={{
                          backgroundColor: "blue",
                          paddingLeft: "8px",
                          borderTop: "1px solid black",
                          color: "white",
                        }}
                      >
                        Troco para:{pedidoEmPreparo.DadosPessoais.troco}
                      </Typography>
                    )}
                  </Box>
                )}

              {enderecoVisivelPorPedido[pedidoEmPreparo.numeroPedido] && (
                <Typography
                  style={{
                    paddingLeft: "8px",
                    borderTop: "1px solid black",
                  }}
                >
                  <b>Endereço :</b>
                  <br />
                  Rua: {pedidoEmPreparo.DadosPessoais.endereco.rua}
                  <br />
                  Bairro: {pedidoEmPreparo.DadosPessoais.endereco.bairro}
                  <br />
                  Casa/Apto: {pedidoEmPreparo.DadosPessoais.endereco.casaApto}
                  <br />
                  CEP: {pedidoEmPreparo.DadosPessoais.endereco.cep}
                  <br />
                  Cidade: {pedidoEmPreparo.DadosPessoais.endereco.cidade}
                  <br />
                  Complemento:{" "}
                  {pedidoEmPreparo.DadosPessoais.endereco.complemento}
                  <br />
                  Estado: {pedidoEmPreparo.DadosPessoais.endereco.estado}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            backgroundColor: "transparent",
            flex: 1,
            minWidth: "300px",
            maxHeight: "30rem",
            overflow: "auto",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              backgroundColor: "orange",
              borderRadius: "8px",
              mt: 1,
            }}
          >
            Esperando Entregador
          </Typography>

          {pedidoFinalizado.map((pedidoFinalizado, index) => (
            <Box
              key={index}
              sx={{
                mt: 1,
                border: "1px  solid #333",
                borderRadius: "15px",
                margin: "0.8rem",
                overflow: "hidden",
                boxShadow: "2px 0px 10px 1px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyItems: "center",
                  width: "100%",
                  height: "2rem",
                  gap: "1rem",
                  pl: 1,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDeEntrega[
                        pedidoFinalizado.DadosPessoais.formaDeEntrega
                      ],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedidoFinalizado.DadosPessoais.formaDeEntrega}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      corPorFormaDePagamento[
                        pedidoFinalizado.DadosPessoais.formaDePagamento
                      ],
                    borderRadius: "15px",
                    width: "5rem",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "white" }}>
                    {pedidoFinalizado.DadosPessoais.formaDePagamento}
                  </Typography>
                </Box>
                <LocalPrintshopRoundedIcon
                  titleAccess="Imprimir pedido"
                  sx={{ cursor: "pointer" }}
                  variant="outlined"
                  onClick={() => imprimirPedido(pedidoFinalizado)}
                />
              </Box>
              <Typography sx={{ pl: 1, pt: 1 }}>
                <b>Nome :</b> {pedidoFinalizado.DadosPessoais.nome}
                <br />
                <b>Telefone :</b> {pedidoFinalizado.DadosPessoais.telefone}
                <br />
                <b>Pedido :</b> {pedidoFinalizado.numeroPedido}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-around",
                  height: "3rem",
                  gap: "1rem",
                }}
              >
                {pedidoFinalizado.itens.length > 0 && (
                  <>
                    <CheckCircleIcon
                      titleAccess="Enviar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "green",
                        borderRadius: "7px",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() =>
                        moverParaPedidosEntregues(pedidoFinalizado)
                      }
                    />

                    {/*<CancelIcon
                      titleAccess="negar pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "red",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                    />*/}

                    <FormatListBulletedRoundedIcon
                      titleAccess="Itens do pedido"
                      className="click"
                      sx={{
                        cursor: "pointer",
                        color: "blue",
                        "&:hover": {
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={() =>
                        setItensVisiveisPorPedido((prevItensVisiveis) => ({
                          ...prevItensVisiveis,
                          [pedidoFinalizado.numeroPedido]: prevItensVisiveis[
                            pedidoFinalizado.numeroPedido
                          ]
                            ? null
                            : pedidoFinalizado.itens,
                        }))
                      }
                    />

                    {pedidoFinalizado.DadosPessoais.formaDeEntrega ==
                    "Retirada" ? (
                      console.log(
                        "nao e pra mostrar o endereco pois e retirada"
                      )
                    ) : (
                      <HomeIcon
                        titleAccess="Endereço do cliente"
                        className="click"
                        sx={{
                          cursor: "pointer",
                          color: "purple",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                        onClick={() =>
                          toggleEnderecoVisivel(pedidoFinalizado.numeroPedido)
                        }
                      />
                    )}
                  </>
                )}
              </Box>

              {itensVisiveisPorPedido[pedidoFinalizado.numeroPedido] ===
                pedidoFinalizado.itens &&
                pedidoFinalizado.itens.length > 0 && (
                  <Box>
                    {pedidoFinalizado.DadosPessoais &&
                      pedidoFinalizado.itens.map((item, itemIndex) => (
                        <Typography
                          key={itemIndex}
                          style={{
                            paddingLeft: "8px",
                            borderTop: "1px solid black",
                          }}
                        >
                          <b>Item:</b> {item.sabor}
                          <br />
                          <b>Quantidade:</b> {item.quantidade}
                          <br />
                          {item.valorOpcional === 0 ||
                          item.valorOpcional === "0" ||
                          item.valorOpcional === "" ? (
                            <>
                              <b>Opcional:</b>
                              {item.opcionalSelecionado}
                              <br />
                              <b>Valor opcional:</b>Grátis
                            </>
                          ) : (
                            <>
                              {item.opcionais == 0 ? (
                                console.log("escolheu bebida")
                              ) : (
                                <>
                                  {" "}
                                  <b>Opcional:</b>
                                  {item.opcionalSelecionado}
                                  <br />
                                  <b>Valor opcional:</b>
                                  R$ {item.valorOpcional}
                                </>
                              )}
                            </>
                          )}
                          {item.observacao === "" ? (
                            console.log("nao tem observacao")
                          ) : (
                            <>
                              <br />
                              <b>Observação:</b>
                              {item.observacao}
                            </>
                          )}
                          {item.opcionais == 0 ? (
                            console.log("nao precisa de espaco se forbebida")
                          ) : (
                            <br />
                          )}
                          {item.adicionais.length === 0 ? (
                            console.log("não tem adicionais")
                          ) : (
                            <>
                              <b>Adicionais:</b>
                              <br />
                              {item.adicionais.map((adicional, index) => (
                                <div key={index}>
                                  <p>
                                    {adicional.name}-({adicional.qtde}x)
                                  </p>
                                </div>
                              ))}
                              <b>Valor Total de adicionais</b>: R${" "}
                              {item.valorTotalAdicionais.toFixed(2)}
                              <br />
                            </>
                          )}
                          <b>Valor Do Item:</b> R$ {item.valorTotalDoProduto}
                          <br />
                        </Typography>
                      ))}
                    <Typography
                      style={{
                        backgroundColor: "green",
                        paddingLeft: "8px",
                        borderTop: "1px solid black",
                        color: "white",
                      }}
                    >
                      Valor Total do pedido: R${" "}
                      {calcularSomaTotal(pedidoFinalizado.itens).toFixed(2)}
                    </Typography>
                    {pedidoFinalizado.DadosPessoais.troco === 0 ||
                    pedidoFinalizado.DadosPessoais.troco === null ||
                    pedidoFinalizado.DadosPessoais.troco === undefined ||
                    pedidoFinalizado.DadosPessoais.troco === "0" ? (
                      console.log("nao precisou de troco/ta trocado")
                    ) : (
                      <Typography
                        style={{
                          backgroundColor: "blue",
                          paddingLeft: "8px",
                          borderTop: "1px solid black",
                          color: "white",
                        }}
                      >
                        Troco para:{pedidoFinalizado.DadosPessoais.troco}
                      </Typography>
                    )}
                  </Box>
                )}

              {enderecoVisivelPorPedido[pedidoFinalizado.numeroPedido] && (
                <Typography
                  style={{
                    paddingLeft: "8px",
                    borderTop: "1px solid black",
                  }}
                >
                  <b>Endereço :</b>
                  <br />
                  Rua: {pedidoFinalizado.DadosPessoais.endereco.rua}
                  <br />
                  Bairro: {pedidoFinalizado.DadosPessoais.endereco.bairro}
                  <br />
                  Casa/Apto: {pedidoFinalizado.DadosPessoais.endereco.casaApto}
                  <br />
                  CEP: {pedidoFinalizado.DadosPessoais.endereco.cep}
                  <br />
                  Cidade: {pedidoFinalizado.DadosPessoais.endereco.cidade}
                  <br />
                  Complemento:{" "}
                  {pedidoFinalizado.DadosPessoais.endereco.complemento}
                  <br />
                  Estado: {pedidoFinalizado.DadosPessoais.endereco.estado}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Container>
  );
}
