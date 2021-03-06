import { MatTableDataSource } from '@angular/material/table';
import { Socket} from 'ngx-socket-io';
import { MatSidenav } from '@angular/material/sidenav';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ProdutoService, ProdutoEntity } from '../_services/produto.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogOption } from '../_components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-produto',
  templateUrl: './produto.component.html',
  styleUrls: ['./produto.component.scss']
})
export class ProdutoComponent implements OnInit {

  public displayedColumns: string[] = ['codigo', 'nome', 'descricao', 'preco', 'options'];
  public produtos: ProdutoEntity[] = [];

  public dataSource = new MatTableDataSource<ProdutoEntity>();

  public errorMessage: string;
  public loading: boolean;

  public produto: ProdutoEntity = new ProdutoEntity();

  @ViewChild(MatSidenav, {static: true}) sidenav: MatSidenav;

  constructor(private service: ProdutoService, private snackBar: MatSnackBar,
              private dialog: MatDialog, private socketClient: Socket) { }

  /**
   * Método disparado na inicialização do componente, logo após sua construção 
   */            
  ngOnInit(): void {
    //Inicializar variaveis de controle
    this.errorMessage = '';
    this.loading = true;

    //Carrega a lista de produtos
    this.service.listarTodos().subscribe(result => {
      
      //Alimenta o datasource da tabela com a lista recebido da service
      this.produtos = result as [];

      //Alimenta o datasource com os produtos
      this.dataSource.data = this.produtos;

    }, error => {

      //Se ocorreu algum erro neste processo, mostra mensagem para usuário
      this.showError('Ops! Aconteceu algo...', error);

    }).add(() => {

      //Após a execução do subscribe, dando erro ou não, oculta a barra de progresso
      this.loading = false;

    });

    //Listner do evento createProduto
    this.socketClient.fromEvent('createProduto').subscribe(result => {
      this.produtos.push(result as ProdutoEntity)
      this.dataSource.data = this.produtos;
    })

    //Listner do evento deleteProduto
    this.socketClient.fromEvent('deleteProduto').subscribe(result => {
      let produto = result as ProdutoEntity;
      let index = this.produtos.findIndex( item => item.id == produto.id);

      this.produtos.splice(index, 1);

      this.dataSource.data = this.produtos;
    })

    //Listner do evento createProduto
    this.socketClient.fromEvent('updateProduto').subscribe(result => {
      let produto = result as ProdutoEntity;
      let index = this.produtos.findIndex( item => item.id == produto.id);

      this.produtos[index] = produto;

      this.dataSource.data = this.produtos;
    })
  }

  /**
   * Método chamado ao confirmar uma inclusão/alteração
   */
  public confirmar(): void {
    //Mostra a barra de progresso
    this.loading = true;

    //Chama o método salvar (incluir ou alterar) da service
    this.service.salvar(this.produto).subscribe(result => {

      //Deu tudo certo, então avise o usuário...
      this.snackBar.open('Registro salvo com sucesso!', '', {
        duration: 3500
      });

    }, error => {
      //Se ocorreu algum erro neste processo, mostra mensagem para usuário
      this.showError('Não foi possível salvar o registro!', error);

    }).add(() => {

      //Após a execução do subscribe, dando erro ou não, 
      //oculta a barra de progresso...
      this.loading = false;

      //... e fecha a sidenav com o formulário
      this.sidenav.close();
    })
  }

  /**
   * Chama a janela de confirmação de exclusão, se usuário confirmar
   * chama evento de exclusão da service.
   * 
   * @param produto 
   */
  public excluir(produto: ProdutoEntity): void {
    
    //Mostra a janela modal de confirmação
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      disableClose: true,
      data: new ConfirmDialogOption('Excluir Registro', 'Deseja realmente exluir o registro?', 'warn')
    });

    //Depois de fechado (clicado em cancelar ou confirmar)...
    dialogRef.afterClosed().subscribe(result => {
      
      //Se confirmou, exclui o registro
      if (result) {
        this.service.excluir(produto.id).subscribe(result => {
          
          //Deu certo, avisa o usuário...
          this.snackBar.open('Registro excluído com sucesso!', '', {
            duration: 3500
          });

        }, error => {
          
          //Se ocorreu algum erro neste processo, mostra mensagem para usuário
          this.showError('Não foi possível excluir o registro!', error);

        }).add(() => {
          
          //Após a execução do subscribe, dando erro ou não, oculta a barra de progresso
          this.loading = false;

        });
      }
    });
  }

  /**
   * Abre o formulário com um novo cliente para inclusão
   */
  public adicionar(): void {
    //Crio um novo objeto e abro o formulario
    this.openSidenav(new ProdutoEntity());
  }

  /**
   * Abre o formulário com os campos preenchidos com os valores
   * do parametro.
   * 
   * @param produto
   */
  public editar(produto: ProdutoEntity): void {
    //Como produto é passado um objeto da tabela por referencia, 
    //se não foir feito uma copia deste, ao alterar a linha da 
    //tabela altera junto.
    this.openSidenav(Object.create(produto));
  }

  /**
   * Função responsável por mostrar uma mensagem de erro padrão.
   * @param text
   * @param error 
   */
  private showError(text: string, error: any): void {
    //Mostra a snackbar com fundo customizado (vermelho)
    this.snackBar.open(text, '', {
      duration: 5000,
      panelClass: 'snakWarn'
    });

    //Adiciona a mensagem de erro no painel de erro
    this.errorMessage = (error.status == 0) ? 'Não foi possível conectar ao servidor' : error.message;
  }

  /**
   * Dá um open na sidnav exibindo o formulário com os dados 
   * da objeto passado por parâmetro.
   * 
   * @param produto 
   */
  private openSidenav(produto: ProdutoEntity): void {
    this.produto = produto;
    this.sidenav.open();
  }

}
